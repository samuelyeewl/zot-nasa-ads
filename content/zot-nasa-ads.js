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
let queryValue = '';

// If a DOI is available, use it for the query
if (doi) {
  queryValue = `doi:${encodeURIComponent(doi)}`;
} else {
  // If no DOI is available, check the "Archive ID" field for an arXiv ID
  let identifier = item.getField('archiveID') || '';
  // If the "Archive ID" field doesn't contain an arXiv ID, try to parse the "URL" field
  if (!identifier.includes('arXiv:')) {
    let url = item.getField('url');
    let arxivMatch = url.match(/arxiv\.org\/abs\/([0-9\.]+)/i);
    if (arxivMatch) {
      identifier = 'arXiv:' + arxivMatch[1];
    }
  }
  // Use the arXiv ID for the query if it's available
  if (identifier.includes('arXiv:')) {
    queryValue = identifier;
  }
}

// If neither a DOI nor an arXiv ID is available, alert the user and exit
if (!queryValue) {
  Zotero.alert(null, "Zot-NASA-ADS", "No identifier (DOI or arXiv ID) found for the selected item.");
  return;
}

// Define the URL for the NASA ADS API.
let nasaAdsApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${queryValue}&fl=title,author,doi,bibcode,abstract,bibstem,volume,issue,page,pub,issn,pubdate,property,identifier,arxiv_class,doctype&rows=1`;

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
    // Zotero.debug(JSON.stringify(adsData))

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
    if (adsData.abstract) item.setField('abstractNote', adsData.abstract);
    if (adsData.pub) item.setField('publicationTitle', adsData.pub);
    if (adsData.bibstem) item.setField('journalAbbreviation', adsData.bibstem[0])
    if (adsData.volume) item.setField('volume', adsData.volume);
    if (adsData.issue) item.setField('issue', adsData.issue);
    if (adsData.pages) item.setField('pages', adsData.page[0]);

    // Strip the day from the date if it's not available.
    if (adsData.pubdate) {
        let formattedPubDate = adsData.pubdate;
        if (formattedPubDate.endsWith("-00")) {
            formattedPubDate = formattedPubDate.substring(0, formattedPubDate.length - 3);
        }
        item.setField('date', formattedPubDate);
    }
    if (adsData.issn) item.setField('ISSN', adsData.issn[0]);
    if (adsData.doi) item.setField('DOI', adsData.doi[0]);
    if (adsData.doi) item.setField('url', `https://doi.org/${adsData.doi[0]}`);

    // Update the Extra field with additional information, preserving existing data.
    let extraLines = item.getField('extra').split('\n');
    let extraUpdateFields = ['ADS Bibcode', 'tex.archivePrefix', 'tex.eprint', 'tex.primaryClass', 'tex.adsurl', 'tex.adsnote'];
    let newExtraLines = extraLines.filter(line => !extraUpdateFields.some(field => line.startsWith(field)));
    newExtraLines.push(`ADS Bibcode: ${adsData.bibcode}`);
    if (adsData.property.includes('EPRINT_OPENACCESS')) {
        let arxivId = adsData.identifier.find(id => id.startsWith('arXiv:'));
        if (arxivId) {
            newExtraLines.push(`tex.archivePrefix: arXiv`);
            newExtraLines.push(`tex.eprint: ${arxivId.replace('arXiv:', '')}`);
        }
        if (adsData.arxiv_class) newExtraLines.push(`tex.primaryClass: ${adsData.arxiv_class[0]}`);
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

Zotero.ZotNasaAds.updatePdfFromNasaAds = async function() {
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
    let queryValue = '';

    // If a DOI is available, use it for the query
    if (doi) {
    queryValue = `doi:${encodeURIComponent(doi)}`;
    } else {
    // If no DOI is available, check the "Archive ID" field for an arXiv ID
    let identifier = item.getField('archiveID') || '';
    // If the "Archive ID" field doesn't contain an arXiv ID, try to parse the "URL" field
    if (!identifier.includes('arXiv:')) {
        let url = item.getField('url');
        let arxivMatch = url.match(/arxiv\.org\/abs\/([0-9\.]+)/i);
        if (arxivMatch) {
        identifier = 'arXiv:' + arxivMatch[1];
        }
    }
    // Use the arXiv ID for the query if it's available
    if (identifier.includes('arXiv:')) {
        queryValue = identifier;
    }
    }

    // If neither a DOI nor an arXiv ID is available, alert the user and exit
    if (!queryValue) {
    Zotero.alert(null, "Zot-NASA-ADS", "No identifier (DOI or arXiv ID) found for the selected item.");
    return;
    }
    
    let nasaAdsApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${queryValue}&fl=esources,bibcode&rows=1`;

    try {
        let response = await Zotero.HTTP.request("GET", nasaAdsApiUrl, {
        headers: {
            "Authorization": "Bearer " + apiKey
        }
        });

        if (response.status !== 200) {
        Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch data from NASA ADS.");
        return;
        }

        let data = JSON.parse(response.responseText);
        if (data.response.docs.length === 0 || !data.response.docs[0].esources.includes('PUB_PDF')) {
        Zotero.alert(null, "Zot-NASA-ADS", "Published PDF is not available for this item.");
        return;
        }

        // Construct the PDF download URL
        let pdfUrl = `https://ui.adsabs.harvard.edu/link_gateway/${data.response.docs[0].bibcode}/PUB_PDF`;

        // Zotero.debug(pdfUrl)

        // Download and attach the PDF
        // await Zotero.Attachments.addPDFFromURLs(item, [pdfUrl])
        cookieSandbox = new Zotero.CookieSandbox(null, 'https://ui.adsabs.harvard.edu/',
            "", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36")
        await Zotero.Attachments.importFromURL({
            libraryID: item.libraryID,
            parentItemID: item.id,
            url: pdfUrl,
            contentType: 'application/pdf',
            referrer: `https://ui.adsabs.harvard.edu/`,
            cookieSandbox: cookieSandbox,
        })

        // // Download the PDF
        // let pdfResponse = await Zotero.HTTP.request("GET", pdfUrl, {
        // headers: {
        //     "Authorization": "Bearer " + apiKey
        // },
        // responseType: 'blob'
        // });

        // if (pdfResponse.status !== 200) {
        // Zotero.alert(null, "Zot-NASA-ADS", "Failed to download PDF from NASA ADS.");
        // return;
        // }

        // // Attach the PDF to the Zotero item
        // let pdfBlob = pdfResponse.response;
        // let pdfFile = new File([pdfBlob], "publication.pdf", { type: "application/pdf" });
        // await Zotero.Attachments.linkFromFile({
        // file: pdfFile,
        // parentItem: item.id
        // });

        Zotero.alert(null, "Zot-NASA-ADS", "PDF downloaded and attached to the Zotero item.");

    } catch (error) {
        Zotero.alert(null, "Zot-NASA-ADS", "An error occurred: " + error.message);
    }
};