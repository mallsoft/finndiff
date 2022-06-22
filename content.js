function save(key, value) {
  return browser.storage.local.set({ [key]: value }).catch((err) => {
    console.error(err);
  });
}

function load(key) {
  return browser.storage.local.get(key).then((res) => {
    return key ? res[key] : res;
  });
}

function getFinnkode() {
  // return new URLSearchParams(document.location.search).get("finnkode");
  const finnkodeField = "#ad-info-heading ~ table tbody tr:nth-of-type(1) td";

  return document.querySelector(finnkodeField)?.textContent.trim();
}

function getLastChangeTimestamp() {
  const dateField = "#ad-info-heading ~ table tbody tr:nth-of-type(2) td";
  const lc = document
    .querySelector(dateField)
    ?.textContent.trim()
    .replaceAll(".", "");

  if (!lc) return;

  return new Date(lc);
}

function getAdSectionElements() {
  const _ref = document.querySelectorAll(
    "main > #realestateClassifiedContainer > .pageholder > div > div"
  );

  const heading = _ref[0].querySelector("section.panel");

  const cost = _ref[0].querySelector("section.panel + div.panel");

  const detail = _ref[0].querySelector("section.panel:nth-of-type(2)");

  const description = _ref[0].querySelector(
    "section.panel:nth-of-type(3) > div"
  );

  const visning = _ref[1].querySelector("h2 + div");

  return {
    heading,
    cost,
    detail,
    description,
    visning,
  };
}

(async function () {
  if (window.spagettiAlarm) return; // prevent multiple executions
  window.spagettiAlarm = true;
  // browser.storage.local.clear();

  const finnkode = getFinnkode();
  if (!finnkode) return; // no finnkode found ...not an ad page?

  let ad = await load(finnkode).catch(console.error);
  const timestamp = getLastChangeTimestamp();
  const elements = getAdSectionElements();

  const htmlMap = {};
  if (!ad || Object.keys(ad).length === 0) {
    // NEW AD

    for (const key in elements) {
      htmlMap[key] = elements[key].innerHTML;
    }
    ad = {
      firstSeen: new Date(),
      firstTimestamp: timestamp,
      entries: [
        {
          timestamp,
          elements: htmlMap,
        },
        // {
        //   // dummy entry to make sure we have at least one extra entry
        //   timestamp: new Date(2023, 0, 1),
        //   elements: { heading: "<h1>Spagetti</h1>" },
        // },
      ],
    };
  } else {
    // UPDATE AD (add new entry)

    const lastEntry = ad.entries[ad.entries.length - 1];
    if (timestamp.getTime() > lastEntry.timestamp.getTime()) {
      console.log("PUTTING SHIT IN");
      for (const key in elements) {
        if (lastEntry.elements[key] !== elements[key].innerHTML) {
          // only add new entry if it differs from last entry
          htmlMap[key] = elements[key].innerHTML;
        }
      }

      ad.entries.push({
        timestamp,
        elements: htmlMap, // can be empty if timestamp is the only difference (silly finn.no)
      });
    }
  }

  if (Object.keys(htmlMap).length) {
    await save(finnkode, ad).catch(console.error);
  }

  // modify relevant nodes to show entries
  const nodeStyle = "background-color: hsl(100,20%,95%); padding: 8px;";
  for (const key in elements) {
    const ref = elements[key];
    if (ref.style === nodeStyle) break;
    ref.style = nodeStyle;

    const entries = ad.entries.filter((entry) => !!entry.elements[key]);
    if (entries.length === 0) continue;

    const div = document.createElement("div");
    div.style = "display: flex; flex-wrap: wrap; gap: 8px;";

    entries.forEach((entry) => {
      const b = document.createElement("button");
      const bstyle =
        "background-color: #fff; border: 1px solid #ccc; padding: 4px;";
      b.style = bstyle;
      b.textContent = entry.timestamp.toLocaleDateString();
      b.onclick = () => {
        div.querySelectorAll("button").forEach((b) => {
          b.style = bstyle;
        });
        b.style =
          "background-color: lightgreen; border: 1px solid #ccc; padding: 4px;";
        ref.innerHTML = entry.elements[key];
        ref.appendChild(div); // add button list again
      };
      div.appendChild(b); // add button
    });

    ref.appendChild(div); // add button list
  }
})();
