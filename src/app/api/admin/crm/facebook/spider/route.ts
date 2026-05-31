import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST /api/admin/crm/facebook/spider
// Handles Facebook lead spider with optional puppeteer support
// Falls back to simulation mode if puppeteer is unavailable
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { url, groupName } = body as { url?: string; groupName?: string };

    if (!url || !groupName) {
      return NextResponse.json({ error: 'url and groupName are required' }, { status: 400 });
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: 'Invalid URL protocol. Must be http or https.' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Create spider run record
    const spiderRun = await prisma.facebookSpiderRun.create({
      data: {
        groupName,
        url,
        status: 'RUNNING',
        createdBy: session.email || undefined,
      },
    });

    const spiderResult: { leadsFound: number; imported: number; errors: string[]; details: string } = {
      leadsFound: 0,
      imported: 0,
      errors: [],
      details: '',
    };

    // Attempt scraping with puppeteer (runtime only, no static import)
    let scrapedData = null;

    try {
      // Dynamic require at runtime - webpack cannot statically analyze this
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer');
      scrapedData = await executePuppeteerScrape(puppeteer, url);
    } catch (err) {
      const errorMsg = String(err);
      if (errorMsg.includes('Cannot find module') || errorMsg.includes('Module not found')) {
        spiderResult.errors.push('Puppeteer module not installed in this environment');
      } else if (errorMsg.includes('navigation') || errorMsg.includes('Timeout')) {
        spiderResult.errors.push(`Navigation failed: ${errorMsg}`);
      } else {
        spiderResult.errors.push(`Scraping error: ${errorMsg}`);
      }
    }

    // If scraping failed or returned nothing, run in simulation mode
    if (!scrapedData || scrapedData.leads?.length === 0) {
      spiderResult.details = JSON.stringify({
        simulation: true,
        mode: scrapedData ? 'no_leads_found' : 'module_not_available',
        url,
        groupName,
        message: scrapedData
          ? 'Spider ran but no potential coach leads found in comments.'
          : 'Puppeteer not available. Running in simulation mode.',
        instructions: getSpiderInstructions(),
      });

      await prisma.facebookSpiderRun.update({
        where: { id: spiderRun.id },
        data: {
          status: 'COMPLETED',
          leadsFound: 0,
          imported: 0,
          errors: spiderResult.errors,
          runDetails: spiderResult.details,
        },
      });

      return NextResponse.json({
        runId: spiderRun.id,
        status: 'COMPLETED',
        simulation: !scrapedData,
        leadsFound: 0,
        imported: 0,
        errors: spiderResult.errors,
        message: scrapedData ? 'No coach leads found in comments.' : 'Running in simulation mode.',
        instructions: getSpiderInstructions(),
      });
    }

    // Process scraped data into leads
    spiderResult.leadsFound = scrapedData.leads?.length || 0;
    spiderResult.details = JSON.stringify(scrapedData);

    // Import leads into CRM
    if (spiderResult.leadsFound > 0) {
      try {
        for (const lead of scrapedData.leads || []) {
          const nameParts = (lead.name || 'Facebook User').split(' ');
          const firstName = nameParts[0] || null;
          const lastName = nameParts.slice(1).join(' ') || null;

          // Check for duplicate
          const existing = await prisma.lead.findFirst({
            where: {
              OR: [
                { email: `scraped-${lead.name?.replace(/\s+/g, '-').toLowerCase()}@facebook.import` },
                {
                  sourceGroupName: groupName,
                  facebookUrl: url,
                  firstName: firstName,
                  lastName: lastName,
                },
              ],
            },
          });

          if (!existing) {
            await prisma.lead.create({
              data: {
                firstName,
                lastName,
                schoolName: lead.name || 'Facebook Contact',
                sourceChannel: 'Facebook',
                sourceGroupName: groupName,
                facebookUrl: url,
                leadNotes: lead.text ? `Scraped comment: ${lead.text.substring(0, 300)}` : null,
                stage: 1,
                estimatedStudents: 200,
                aiEstimatedValue: 1400,
              },
            });
            spiderResult.imported++;

// Log engagement event
            const createdLead = await prisma.lead.findFirst({
              where: { email: `scraped-${lead.name?.replace(/\s+/g, '-').toLowerCase()}@facebook.import` },
            });
            if (createdLead) {
              await prisma.engagementEvent.create({
                data: {
                  leadId: createdLead.id,
                  channel: 'spider',
                  actionType: 'LEAD_CAPTURED',
                  contentPreview: `Lead captured via Facebook spider from ${groupName}`,
                  fullContent: JSON.stringify({ source: groupName, url, comment: lead.text }),
                  isAuto: true,
                  sentBy: session.email || undefined,
                },
              }).catch(() => {}); // Non-fatal
            }
          }
        }
      } catch (importErr) {
        spiderResult.errors.push(`Import error: ${importErr}`);
      }
    }

    // Finalize spider run
    await prisma.facebookSpiderRun.update({
      where: { id: spiderRun.id },
      data: {
        status: spiderResult.errors.length > 0 && spiderResult.leadsFound === 0 ? 'FAILED' : 'COMPLETED',
        leadsFound: spiderResult.leadsFound,
        imported: spiderResult.imported,
        errors: spiderResult.errors,
        runDetails: spiderResult.details,
      },
    });

    return NextResponse.json({
      runId: spiderRun.id,
      status: spiderResult.errors.length > 0 && spiderResult.leadsFound === 0 ? 'FAILED' : 'COMPLETED',
      leadsFound: spiderResult.leadsFound,
      imported: spiderResult.imported,
      errors: spiderResult.errors,
      details: spiderResult.details,
    });
  } catch (error) {
    console.error('Facebook spider error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function executePuppeteerScrape(puppeteer: any, url: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-extensions',
      '--disable-sync',
    ],
  });

  try {
    const page = await browser.newPage();

    // Stealth: hide automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate with retries
    let navigated = false;
    for (let attempt = 0; attempt < 3 && !navigated; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        navigated = true;
      } catch (navErr) {
        if (attempt === 2) throw new Error(`Navigation failed: ${navErr}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract comment data
    const extractedData = await page.evaluate(() => {
      const comments: { name: string; text: string }[] = [];

      // Multiple selector strategies for Facebook's changing DOM
      const selectorStrategies = [
        '[data-ad-preview="message"]',
        '.userContent',
        '[data-testid="UFI2CommentBody"]',
        'div[data-ad-preview]',
        '.x1n2onr6 [role="article"] span',
      ];

      let foundElements: NodeListOf<Element> | null = null;
      for (const sel of selectorStrategies) {
        const els = document.querySelectorAll(sel);
        if (els && els.length > 0) {
          foundElements = els;
          break;
        }
      }

      if (foundElements) {
        foundElements.forEach(el => {
          const textContent = el.textContent?.trim() || '';
          if (textContent.length > 5 && textContent.length < 1000) {
            const articleEl = el.closest('[role="article"]') || el.parentElement?.parentElement;
            let commenterName = 'Facebook User';

            // Try to extract name from various patterns
            const nameSelectors = [
              'a[href*="/user/"]',
              '[data-ad-preview="name"]',
              '.x1i10vfl',
              'span[data-testid="UserName"]',
              '[role="article"] a:first-child',
            ];

            for (const nameSel of nameSelectors) {
              const nameEl = articleEl?.querySelector(nameSel);
              if (nameEl?.textContent?.trim()) {
                commenterName = nameEl.textContent.trim();
                break;
              }
            }

            comments.push({
              name: commenterName,
              text: textContent,
            });
          }
        });
      }

      return {
        comments,
        pageTitle: document.title,
        finalUrl: window.location.href,
      };
    });

    await browser.close();

    // Filter for potential coach leads
    const coachKeywords = [
      'coach', 'head coach', 'assistant coach', 'coordinator',
      'director', 'athletic director', 'head', 'football', 'basketball',
      'soccer', 'baseball', 'softball', 'lacrosse', 'wrestling',
      'volleyball', 'tennis', 'golf', 'swim', 'track', 'field', 'hockey',
      'strength', 'conditioning', 'training', '@', 'high school',
    ];

    const potentialLeads = (extractedData.comments as { name: string; text: string }[]).filter(comment => {
      const lowerText = comment.text.toLowerCase();
      return (
        coachKeywords.some(kw => lowerText.includes(kw)) ||
        comment.text.includes('@') ||
        /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(comment.text) // phone number pattern
      );
    });

    return {
      totalCommentsFound: extractedData.comments.length,
      leads: potentialLeads.slice(0, 50).map(l => ({
        name: l.name,
        text: l.text.substring(0, 200),
      })),
      pageTitle: extractedData.pageTitle,
      scrapedUrl: extractedData.finalUrl,
    };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

function getSpiderInstructions(): string {
  return `
Facebook Spider - Instructions:

The spider performs the following steps:
1. Launches a headless Chrome browser via Puppeteer
2. Navigates to the provided Facebook group post URL
3. Extracts all visible comments and commenter names
4. Filters comments for potential coach/school leads using keyword matching
5. Creates Lead records in the CRM for each potential lead
6. Logs engagement events for audit trail

Keywords used for lead identification:
- Coach titles: coach, head coach, coordinator, director, athletic director
- Sports: football, basketball, soccer, baseball, softball, etc.
- Indicators: @mentions, phone numbers, school references

Rate limiting: 2-6 second delays between retry attempts

Limitations:
- Facebook login-gated content cannot be scraped
- Anti-scraping measures may limit data extraction
- Use Manual Import for most reliable results
  `.trim();
}