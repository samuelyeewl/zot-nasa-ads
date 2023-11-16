# Zotero NASA ADS Metadata Updater

This Zotero plugin allows one to update the Zotero metadata and/or download a publisher PDF for a given paper based on a query to the [SAO/NASA Astrophysics Data System](https://ui.adsabs.harvard.edu/) database. This is particularly useful to update papers that were first added to Zotero from the arXiv with their published versions.

## Usage
- First, obtain a NASA ADS API Key by going to [this page](https://ui.adsabs.harvard.edu/help/api/) and logging in.
- Enter the API Key, either by going to Tools > Enter NASA ADS API Key or in the popup on first run.
- Right click an item and select "Update Metadata from NASA ADS" to query the NASA ADS database using either the DOI (preferred) or arXiv number. The plugin retrieves all the necessary information from the server, including the [NASA ADS Bibcodes](https://ui.adsabs.harvard.edu/help/actions/bibcode) and ADS URLs, which are stored in the "extra" field and can be accessed by Better BibTeX.
- Selecting "Download Publisher PDF from NASA ADS" uses the ADS API to redirect to the publisher PDF. This will fail if you do not have access to the PDF (e.g., through a VPN or on-campus access for non-Open Access articles).

## Caveats
- PDF download may fail due to hitting a Captcha. 

## License

Distributed under version 3 of the GNU Affero General Public License (AGPL).