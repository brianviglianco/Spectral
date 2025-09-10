// Detector multi-fuente: DOM + window + red (score por proveedor)
export const CMP_SIGNATURES = {
  OneTrust: {
    dom: [/#onetrust-/, /#ot-sdk/, /#optanon/, /#Optanon/],
    win: [/Optanon/, /OneTrust/, /OnetrustActiveGroups/],
    net: [/cookielaw\.org/, /cookiepro\.com/],
  },
  Cookiebot: {
    dom: [/#CybotCookiebotDialog/, /data-cookieconsent/, /#Cookiebot/],
    win: [/Cookiebot/],
    net: [/consent\.cookiebot\.com/],
  },
  TrustArc: {
    dom: [/#truste-consent/, /#consent_blackbar/],
    win: [/TrustArc/, /truste/],
    net: [/consent\.trustarc\.com/, /truste\.com/],
  },
  Didomi: {
    dom: [/#didomi-(popup|host|notice)/],
    win: [/Didomi/],
    net: [/didomi\.io/, /privacy-center\.org/],
  },
  Sourcepoint: {
    dom: [/#sp_message_container/, /#sp_veil/],
    win: [/_sp_/, /spConsent/],
    net: [/sp-prod\.net/, /spccdn\.net/],
  },
  Quantcast: {
    dom: [/#qc-cmp2-/, /#qc-cmp-ui/],
    win: [/Quantcast/],
    net: [/choice\.quantcast\.com/, /consensu\.org/],
  },
  Usercentrics: {
    dom: [/#usercentrics-root/],
    win: [/UC_UI/],
    net: [/app\.usercentrics\.eu/],
  },
  Axeptio: {
    dom: [/#axeptio_/, /#axeptio_overlay/],
    win: [/Axeptio/],
    net: [/static\.axept\.io/],
  },
  CookieYes: {
    dom: [/#cookie-law-info/, /#cookieyes/],
    win: [/cookieYes/],
    net: [/cdn-cookieyes\.com/, /cookie-law-info/],
  },
};

const scoreAdd = (map, key, w) => (map[key] = (map[key] || 0) + w);

export async function detectCMP(page, {networkWindowMs = 2500} = {}) {
  const signals = [];
  const scores = {};

  // 1) DOM
  for (const [prov, sig] of Object.entries(CMP_SIGNATURES)) {
    for (const rx of sig.dom) {
      const found = await page.$eval('html', (el, s) => {
        const r = new RegExp(s);
        return !!document.querySelectorAll('*').length &&
               (document.body.outerHTML.match(r) || document.documentElement.outerHTML.match(r));
      }, rx.source).catch(() => false);
      if (found) { signals.push({provider: prov, source: 'dom', pattern: rx.source}); scoreAdd(scores, prov, 2); }
    }
  }

  // 2) Globals (window)
  const winDump = await page.evaluate(() => Object.getOwnPropertyNames(window).slice(0, 5000));
  for (const [prov, sig] of Object.entries(CMP_SIGNATURES)) {
    for (const rx of sig.win) {
      if (winDump.some(k => rx.test(k))) { signals.push({provider: prov, source: 'win', pattern: rx.source}); scoreAdd(scores, prov, 1); }
    }
  }

  // 3) Network (escucha breve)
  const seen = [];
  const onReq = req => { const u = req.url(); seen.push(u); };
  page.on('request', onReq);
  await page.waitForTimeout(networkWindowMs);
  page.off('request', onReq);

  for (const [prov, sig] of Object.entries(CMP_SIGNATURES)) {
    for (const rx of sig.net) {
      if (seen.some(u => rx.test(u))) { signals.push({provider: prov, source: 'net', pattern: rx.source}); scoreAdd(scores, prov, 3); }
    }
  }

  // ganador por puntaje
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const provider = best ? best[0] : 'None';
  return { detected: provider !== 'None', provider, signals, scores, netSample: seen.slice(0, 50) };
}
