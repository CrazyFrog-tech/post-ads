import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const CHROME_PATHS: Record<string, string> = {
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
};
const CHROME_PATH = CHROME_PATHS[process.platform] || '';
if (!CHROME_PATH || !fs.existsSync(CHROME_PATH)) {
  console.error(`❌ Chrome not found at: ${CHROME_PATH || 'Unknown path for this OS'}`);
  process.exit(1);
}

export interface AdConfig {
  title: string;
  description: string;
  price: string;
  imageDir: string;
}

async function handleConsent(page: Page) {
  try {
    const iframeElement = await page.waitForSelector('iframe#sp_message_iframe_1278200', { timeout: 7000 });
    const frame = await iframeElement?.contentFrame();
    if (frame) {
      await (await frame.waitForSelector('button[title="Accepteren"]', { timeout: 5000 })).click();
      console.log('✅ Clicked "Accepteren" inside consent iframe.');
    } else {
      console.log('⚠️ Consent iframe found but could not get content frame.');
    }
  } catch {
    console.log('ℹ️ Consent iframe or Accepteren button not found.');
  }
}

async function login(page: Page) {
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 7000 });
    await page.fill('input[type="email"]', process.env.EMAIL || '');
    await page.fill('input[type="password"]', process.env.PASSWORD || '');
    await page.click('button:has-text("Inloggen met je e-mailadres")');
    console.log('✅ Filled in email, password, and clicked "Inloggen met je e-mailadres".');
  } catch {
    console.log('⚠️ Could not fill in login form or click login button.');
  }
}

async function uploadImages(page: Page, imageDir: string) {
  try {
    const images = fs.readdirSync(imageDir)
      .filter((f: string) => /\.(png|jpe?g|heic)$/i.test(f))
      .map((f: string) => path.join(imageDir, f));
    if (images.length === 0) throw new Error('No images found in folder');
    const dropZone = await page.waitForSelector('#photo-upload .upload-wrapper input[type="file"]', { timeout: 10000 });
    await dropZone.setInputFiles(images);
    console.log('✅ Drag-and-drop uploaded all images from folder to the photo upload input.');
  } catch (e) {
    console.log('⚠️ Could not drag-and-drop upload images:', e);
  }
}

async function fillDescription(page: Page, description: string) {
  try {
    const beschrijvingLabel = await page.waitForSelector('label:has-text("Beschrijving")', { timeout: 10000 });
    await beschrijvingLabel.scrollIntoViewIfNeeded();
    const iframe = await page.waitForSelector('iframe#description_nl-NL_ifr', { timeout: 10000 });
    const frame = await iframe.contentFrame();
    if (!frame) throw new Error('Could not get TinyMCE iframe content frame');
    await frame.waitForSelector('body', { timeout: 5000 });
    await frame.fill('body', description);
    console.log('✅ Filled in the Beschrijving rich text editor.');
  } catch (e) {
    console.log('⚠️ Could not fill in Beschrijving:', e);
  }
}

async function fillAttributes(page: Page) {
  try {
    const kenmerkenSection = await page.waitForSelector('#attributes-section', { timeout: 10000 });
    await kenmerkenSection.scrollIntoViewIfNeeded();
    await page.selectOption('select[name="singleSelectAttribute[condition]"]', { label: 'Nieuw' });
    await page.selectOption('select[name="singleSelectAttribute[religion]"]', { label: 'Islam' });
    await page.selectOption('select[name="singleSelectAttribute[type]"]', { label: 'Kleding' });
    console.log('✅ Filled in Kenmerken (attributes) section.');
  } catch (e) {
    console.log('⚠️ Could not fill in Kenmerken (attributes):', e);
  }
}

async function fillPrice(page: Page, price: string) {
  try {
    const priceTypeSection = await page.waitForSelector('#syi-price-type', { timeout: 10000 });
    await priceTypeSection.scrollIntoViewIfNeeded();
    await page.selectOption('#syi-price-type select[name="price.typeValue"]', { label: 'Vraagprijs' });
    const priceInputSection = await page.waitForSelector('#syi-bidding-price', { timeout: 10000 });
    await priceInputSection.scrollIntoViewIfNeeded();
    const priceInput = await priceInputSection.waitForSelector('input[placeholder="0,00"]', { timeout: 5000 });
    await priceInput.fill(price);
    console.log('✅ Filled in price input with ' + price);
  } catch (e) {
    console.log('⚠️ Could not fill in price input:', e);
  }
}

async function selectOphalen_of_Verzenden(page: Page) {
  try {
    const ophalenRadio = await page.waitForSelector('input[type="radio"]#Ophalen_of_Verzenden', { timeout: 10000 });
    const isChecked = await ophalenRadio.isChecked();
    if (!isChecked) {
      await ophalenRadio.click();
      console.log('✅ Selected the "Ophalen_of_Verzenden" radio button.');
    } else {
      console.log('ℹ️ "Ophalen_of_Verzenden" radio button was already selected.');
    }
  } catch (e) {
    console.log('⚠️ Could not select "Ophalen_of_Verzenden" radio button:', e);
  }
}

async function selectGratisBundle(page: Page) {
  try {
    const adFeaturesDiv = await page.waitForSelector('#ad-features', { timeout: 10000 });
    await adFeaturesDiv.scrollIntoViewIfNeeded();
    const gratisSpan = await page.waitForSelector('span.title:text-is("Gratis")', { timeout: 10000 });
    await gratisSpan.click();
    console.log('✅ Clicked the span with class "title" and text "Gratis".');
  } catch (e) {
    console.log('⚠️ Could not click the span with class "title" and text "Gratis":', e);
  }
}

async function placeAd(page: Page) {
  try {
    const placeAdButton = await page.waitForSelector('#syi-place-ad-button', { timeout: 10000 });
    await placeAdButton.scrollIntoViewIfNeeded(); 
    await placeAdButton.click();
    console.log('✅ Clicked the button with id "syi-place-ad-button" to place the ad.');
  } catch (e) {
    console.log('⚠️ Could not click the button with id "syi-place-ad-button":', e);
  }
}

async function goToPlaatsAdvertentie(page: Page) {
  try {
    // Wait for the navigation menu to appear
    await page.waitForSelector('ul');
    // Find the <li> with a <span> containing 'Plaats advertentie'
    const li = await page.$('ul li:has(span:text-is("Plaats advertentie"))');
    if (li) {
      await li.click();
      console.log('✅ Clicked on "Plaats advertentie" in the navigation menu.');
    } else {
      console.log('⚠️ Could not find "Plaats advertentie" in the navigation menu.');
    }
  } catch (e) {
    console.log('⚠️ Error clicking "Plaats advertentie" in the navigation menu:', e);
  }
}

export async function postAd(config: AdConfig, page?: Page) {
  let localBrowser: Browser | undefined;
  if (!page) {
    localBrowser = await chromium.launch({ headless: false, executablePath: CHROME_PATH });
    const context = await localBrowser.newContext();
    page = await context.newPage();
    await page.goto('https://www.google.com');
    await page.click('button:has-text("Alles afwijzen")');
    await page.goto('https://www.marktplaats.nl');
    await handleConsent(page);
    try {
      const plaatsButton = await page.waitForSelector('a.hz-Button--callToAction:has-text("Plaats advertentie")', { timeout: 7000 });
      await plaatsButton.click();
      console.log('✅ Clicked "Plaats advertentie" button.');
    } catch {
      console.log('⚠️ "Plaats advertentie" button not found.');
    }
    await login(page);
  }
  // Fill in ad title and click 'Vind categorie'
  try {
    await page.waitForSelector('#TextField-vulEenTitelIn', { timeout: 7000 });
    await page.fill('#TextField-vulEenTitelIn', config.title);
    await page.click('button:has-text("Vind categorie")');
    console.log('✅ Filled in ad title and clicked "Vind categorie".');
  } catch {
    console.log('⚠️ Could not fill in ad title or click "Vind categorie" button.');
  }
  // Click the radio input next to 'Religie' label
  try {
    const religieLabel = await page.waitForSelector('label:has-text("Religie")', { timeout: 7000 });
    const radio = await religieLabel.evaluateHandle(label => {
      let input = label.parentElement?.querySelector('input[type="radio"]');
      if (!input) {
        if (label.nextElementSibling && (label.nextElementSibling as HTMLInputElement).tagName === 'INPUT') {
          const nextInput = label.nextElementSibling as HTMLInputElement;
          if (nextInput.type === 'radio') input = nextInput;
        }
      }
      return input;
    });
    if (radio) {
      await radio.asElement()?.click();
      console.log('✅ Clicked radio input next to "Religie" label.');
    } else {
      console.log('⚠️ Could not find radio input next to "Religie" label.');
    }
  } catch {
    console.log('⚠️ Could not find or click radio input for "Religie".');
  }
  // Click the 'Verder' button
  try {
    await page.waitForSelector('button:has-text("Verder")', { timeout: 7000 });
    await page.click('button:has-text("Verder")');
    console.log('✅ Clicked "Verder" button.');
  } catch {
    console.log('⚠️ Could not find or click "Verder" button.');
  }
  await uploadImages(page, config.imageDir);
  await fillDescription(page, config.description);
  await fillAttributes(page);
  await fillPrice(page, config.price);
  await selectOphalen_of_Verzenden(page);
  await selectGratisBundle(page);
  await placeAd(page);
  await goToPlaatsAdvertentie(page);
  if (localBrowser) {
    await localBrowser.close();
  }
}

if (require.main === module) {
  const adConfigs: AdConfig[] = [
    {
      title: 'Gebedskleed voor Stellen – Perfect voor man en vrouw',
      description: `Voor een hele Zachte prijs.\n\n<b>Nieuwe Gebedskleed voor Stellen – Samen bidden, samen sterker.</b>\nDit gebedskleed is ontworpen voor echtparen die hun band willen versterken door gezamenlijke gebeden.\nHet biedt de perfecte ruimte om samen spiritueel verbonden te zijn.\nGemaakt van zacht, duurzaam materiaal voor comfort en ondersteuning tijdens elke gebedsmoment.\n<br><br>Voor Vragen stuur gerust een bericht.\n\n<hr>\n<b>#gebedskleed #stellen #islam #cadeau #gebed #moslim #koppel #biddendoejesamen</b><br>\n<small>Zoektermen: gebedskleed, gebedskleed stellen, islamitisch cadeau, gebed mat, samen bidden, moslim koppel, gebedskleed kopen, gebedskleed aanbieding</small>`,
      price: '30',
      imageDir: path.join(process.cwd(), 'images', 'couples-prayermat'),
    },
    {
      title: 'Premium Draagbaar Muslim Sajadah',
      description: `Nergen goedkoper. <b>Reisvriendelijk Gebedskleed.</b>\nLichtgewicht, compact en duurzaam, perfect voor onderweg.\nDit hoogwaardige gebedskleed biedt comfort en gemak, zodat je overal je gebed kunt verrichten zonder concessies te doen aan kwaliteit.\nIdeaal voor dagelijks gebruik en reizen door het kleine formaat.\nVerschillende kleuren beschikbaar.\n<br><br>Voor Vragen stuur gerust een bericht.\n\n<hr>\n<b>#sajadah #gebedskleed #draagbaar #reizen #islam #moslim #travel #compact</b><br>\n<small>Zoektermen: draagbaar gebedskleed, muslim sajadah, reis gebedskleed, gebedskleed lichtgewicht, gebedskleed compact, gebedskleed reizen, gebedskleed aanbieding</small>`,
      price: '4',
      imageDir: path.join(process.cwd(), 'images', 'portable -muslim-sajadah-travel'),
    },
    {
      title: 'Digitale Tasbih handteller',
      description: `<b>Deze tasbih handteller is de beste in de markt.</b>\nHet is een praktisch hulpmiddel voor je gebed en een cadeau voor geliefden, zodat ze constant verbonden blijven met Allah.\nVerschillende kleuren beschikbaar. Scherpe prijzen.\n<br><br>\n<hr>\n<b>#tasbih #handteller #digitaal #gebed #islam #moslim #dhikr #cadeau</b><br>\n<small>Zoektermen: digitale tasbih, handteller gebed, tasbih kopen, digitale tasbih aanbieding, islamitisch cadeau, dhikr teller, tasbih met scherm</small>`,
      price: '7',
      imageDir: path.join(process.cwd(), 'images', 'Digitale-Tasbih-handteller'),
    },
    {
      title: 'Gebedskleed met mesbaha in mooie verpakking',
      description: `<b>Zacht en comfortabel gebedskleed</b> – Gemaakt van hoogwaardig, ultrazacht materiaal voor optimaal comfort en ondersteuning.\nLichtgewicht en ideaal voor thuis of werk.\nPerfect voor dagelijks gebruik of als een mooi cadeautje.\nKomt met een mesbaha (gebedsketting) in een mooie verpakking, waardoor het een perfect cadeau is voor jezelf of je geliefden.\n<br><br>Voor Vragen stuur gerust een bericht.\n\n<hr>\n<b>#gebedskleed #mesbaha #cadeau #islam #moslim #gebedsketting #verpakking #zacht</b><br>\n<small>Zoektermen: gebedskleed met mesbaha, gebedskleed cadeau, gebedskleed zacht, gebedskleed verpakking, islamitisch cadeau, gebedsketting, gebedskleed aanbieding</small>`,
      price: '11',
      imageDir: path.join(process.cwd(), 'images', 'Gebedskleed-met-mesbaha'),
    },
    {
      title: 'Digitale telring voor gebed met verstelbaar bandje en schermpje',
      description: `<b>Digitale telring (Tasbih)</b>, met een verstelbaar bandje en een schermpje voor nauwkeurig tellen.\nIdeaal voor dagelijkse gebeden en dhikr.\nKlein maar fijn. Verschillende kleuren beschikbaar.\n<br><br>Voor Vragen stuur gerust een bericht.\n\n<hr>\n<b>#telring #tasbih #digitaal #gebed #islam #moslim #dhikr #verstelbaar</b><br>\n<small>Zoektermen: digitale telring, tasbih ring, verstelbare tasbih, digitale tasbih, dhikr ring, islamitisch cadeau, tasbih aanbieding</small>`,
      price: '2',
      imageDir: path.join(process.cwd(), 'images', 'handcounter-basic'),
    }
    // Voeg hier meer advertenties toe indien gewenst
  ];
  const runCount = parseInt(process.argv[2] || '1', 10);
  (async () => {
    const browser = await chromium.launch({ headless: false, executablePath: CHROME_PATH });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.google.com');
    await page.click('button:has-text("Alles afwijzen")');
    await page.goto('https://www.marktplaats.nl');
    await handleConsent(page);
    // Click on the 'Plaats advertentie' button
    try {
      const plaatsButton = await page.waitForSelector('a.hz-Button--callToAction:has-text("Plaats advertentie")', { timeout: 7000 });
      await plaatsButton.click();
      console.log('✅ Clicked "Plaats advertentie" button.');
    } catch {
      console.log('⚠️ "Plaats advertentie" button not found.');
    }
    await login(page);
    for (let i = 0; i < runCount; i++) {
      for (const config of adConfigs) {
        console.log(`\n=== Posting ad run ${i + 1} of ${runCount} for title: ${config.title} ===`);
        await postAd(config, page);
        await new Promise(res => setTimeout(res, 1500)); // Wait 0.5 sec between ads
      }
    }
    await browser.close();
    process.exit(0);
  })();
}
