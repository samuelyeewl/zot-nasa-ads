if (typeof Zotero.ZotNasaAds == 'undefined') {
    Zotero.ZotNasaAds = {};
}

// Function to prompt for the API key
Zotero.ZotNasaAds.promptForApiKey = function() {
    var apiKey = Zotero.Prefs.get('extensions.zotnasaads.apikey');
    var newApiKey = prompt("Please enter your NASA ADS API key:", apiKey || "");
    if (newApiKey !== null) { // If the user clicks "OK"
      Zotero.Prefs.set('extensions.zotnasaads.apikey', newApiKey);
    }
};
  
// Function to get the stored API key
Zotero.ZotNasaAds.getApiKey = function() {
return Zotero.Prefs.get('extensions.zotnasaads.apikey');
};

Zotero.ZotNasaAds.updateMetadataFromNasaAds = async function() {
// Check for the API key, and prompt the user if it's not set.
let apiKey = Zotero.ZotNasaAds.getApiKey();
if (!apiKey) {
  Zotero.ZotNasaAds.promptForApiKey();
  apiKey = Zotero.ZotNasaAds.getApiKey();
  // If the user cancels the prompt, apiKey will be null or empty.
  if (!apiKey) {
    Zotero.alert(null, "Zot-NASA-ADS", "Operation cancelled. NASA ADS API key is required.");
    return;
  }
}

// Get the selected item in Zotero.
let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
if (selectedItems.length != 1) {
    Zotero.alert(null, "Zot-NASA-ADS", "Please select one item.");
    return;
}

let item = selectedItems[0];
let doi = item.getField('DOI');
if (!doi) {
    Zotero.alert(null, "Zot-NASA-ADS", "No DOI found for the selected item.");
    return;
}

// Define the URL for the NASA ADS API.
let nasaAdsApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=doi:${encodeURIComponent(doi)}&fl=title,author,doi,bibcode,abstract,bibstem,volume,issue,page,pub,issn,pubdate,property,identifier,arxiv_class,doctype&rows=1`;

// Make the HTTP request to the NASA ADS API.
try {
    let response = await Zotero.HTTP.request("GET", nasaAdsApiUrl, {
    headers: {
        "Authorization": "Bearer " + apiKey,
    }
    });

    if (response.status !== 200) {
    Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch data from NASA ADS.");
    return;
    }

    // Parse the response and update the item's metadata.
    let data = JSON.parse(response.responseText);
    if (data.response.docs.length === 0) {
    Zotero.alert(null, "Zot-NASA-ADS", "No results found for the DOI.");
    return;
    }

    let adsData = data.response.docs[0];
    Zotero.debug(JSON.stringify(adsData))

    // Check that there is a non-arXiv result.
    if (adsData.doctype === 'eprint') {
        Zotero.alert(null, "Zot-NASA-ADS", "No non-arXiv result found for the DOI.");
        return;
    }

    // Change the item type to journal article if it's currently a preprint.
    if (item.itemTypeID === Zotero.ItemTypes.getID('preprint') &&
            adsData.doctype === 'article') {
        item.setType(Zotero.ItemTypes.getID('journalArticle'));
        await item.saveTx();
    }

    // Update fields with the data from NASA ADS.
    item.setCreators(adsData.author.map(name => {
        let [lastName, firstName] = name.split(", ");
        return { lastName, firstName, creatorType: "author" };
    }));
    item.setField('abstractNote', adsData.abstract);
    item.setField('publicationTitle', adsData.pub);
    item.setField('journalAbbreviation', adsData.bibstem[0])
    item.setField('volume', adsData.volume);
    item.setField('issue', adsData.issue);
    item.setField('pages', adsData.page[0]);
    // Strip the day from the date if it's not available.
    let formattedPubDate = adsData.pubdate;
    if (formattedPubDate.endsWith("-00")) {
        formattedPubDate = formattedPubDate.substring(0, formattedPubDate.length - 3);
    }
    item.setField('date', formattedPubDate);
    item.setField('ISSN', adsData.issn[0]);
    item.setField('DOI', adsData.doi[0]);
    item.setField('url', `https://doi.org/${adsData.doi[0]}`);

    // Update the Extra field with additional information, preserving existing data.
    let extraLines = item.getField('extra').split('\n');
    let extraUpdateFields = ['ADS Bibcode', 'tex.archivePrefix', 'tex.eprint', 'tex.primaryClass', 'tex.adsurl', 'tex.adsnote'];
    let newExtraLines = extraLines.filter(line => !extraUpdateFields.some(field => line.startsWith(field)));
    newExtraLines.push(`ADS Bibcode: ${adsData.bibcode}`);
    if (adsData.property.includes('EPRINT_OPENACCESS')) {
        let arxivId = adsData.identifier.find(id => id.startsWith('arXiv:'));
        newExtraLines.push(`tex.archivePrefix: arXiv`);
        newExtraLines.push(`tex.eprint: ${arxivId.replace('arXiv:', '')}`);
        newExtraLines.push(`tex.primaryClass: ${adsData.arxiv_class}`);
    }
    newExtraLines.push(`tex.adsurl: https://ui.adsabs.harvard.edu/abs/${adsData.bibcode}`);
    newExtraLines.push(`tex.adsnote: Provided by the SAO/NASA Astrophysics Data System`);
    item.setField('extra', newExtraLines.join('\n'));

    await item.saveTx();

    Zotero.alert(null, "Zot-NASA-ADS", "Metadata updated from NASA ADS.");

} catch (error) {
    Zotero.alert(null, "Zot-NASA-ADS", "An error occurred: " + error.message);
}
};