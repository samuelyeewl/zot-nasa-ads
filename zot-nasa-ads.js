ZotNasaAds = {
    id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],

    log(msg) {
		Zotero.debug("zot-nasa-ads: " + msg);
	},

    init({ id, version, rootURI }) {
		if (this.initialized) return;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;

        this.log("Initialized");
        this.log(Zotero.Prefs.get('extensions.zotero.zot-nasa-ads.api-key', true))
	},

    addToWindow(window) {
        let doc = window.document;

        // Add separator before our menu items
        let separatorBefore = doc.createXULElement("menuseparator");
        separatorBefore.id = 'zot-nasa-ads-separator-before';
        doc.getElementById('zotero-itemmenu').appendChild(separatorBefore);
        this.storeAddedElement(separatorBefore);

        // Add menu option for updating metadata
        let updateMenuItem = doc.createXULElement("menuitem");
        updateMenuItem.id = 'zot-nasa-ads-update-metadata-menu';
        updateMenuItem.setAttribute('label', 'Update Metadata from NASA ADS');
        doc.getElementById('zotero-itemmenu').appendChild(updateMenuItem);
        updateMenuItem.addEventListener('command', () => {
            this.updateMetadataFromNasaAds();
        });
        this.storeAddedElement(updateMenuItem);

        // Add menu option for downloading PDF
        let pdfMenuItem = doc.createXULElement("menuitem");
        pdfMenuItem.id = 'zot-nasa-ads-download-pdf-menu';
        pdfMenuItem.setAttribute('label', 'Download Publisher PDF from NASA ADS');
        doc.getElementById('zotero-itemmenu').appendChild(pdfMenuItem);
        pdfMenuItem.addEventListener('command', () => {
            this.updatePdfFromNasaAds();
        });
        this.storeAddedElement(pdfMenuItem);

        // Add menu option for getting citation information
        let citationMenuItem = doc.createXULElement("menuitem");
        citationMenuItem.id = 'zot-nasa-ads-citation-info-menu';
        citationMenuItem.setAttribute('label', 'Get Citation Information from NASA ADS');
        doc.getElementById('zotero-itemmenu').appendChild(citationMenuItem);
        citationMenuItem.addEventListener('command', () => {
            this.getCitationInfoFromNasaAds();
        });
        this.storeAddedElement(citationMenuItem);

        // Add menu option for getting references
        let referencesMenuItem = doc.createXULElement("menuitem");
        referencesMenuItem.id = 'zot-nasa-ads-references-menu';
        referencesMenuItem.setAttribute('label', 'Get References from NASA ADS');
        doc.getElementById('zotero-itemmenu').appendChild(referencesMenuItem);
        referencesMenuItem.addEventListener('command', () => {
            this.getReferencesFromNasaAds();
        });
        this.storeAddedElement(referencesMenuItem);

        // Add separator after our menu items
        let separatorAfter = doc.createXULElement("menuseparator");
        separatorAfter.id = 'zot-nasa-ads-separator-after';
        doc.getElementById('zotero-itemmenu').appendChild(separatorAfter);
        this.storeAddedElement(separatorAfter);
        
        // Add a new tab to the item pane to show citation information
        this.registerItemboxTab(window);
        
        // Add an observer to update citation display when items are selected
        this.registerItemSelectionObserver(window);
    },

    addToAllWindows() {
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            if (!win.ZoteroPane) continue;
            this.addToWindow(win);
        }
    },

    storeAddedElement(elem) {
        if (!elem.id) {
            throw new Error("Element must have an id");
        }
        this.addedElementIDs.push(elem.id);
    },

    removeFromWindow(window) {
        var doc = window.document;
        // Remove all elements added to DOM
        for (let id of this.addedElementIDs) {
            doc.getElementById(id)?.remove();
        }
        
        // Unregister notifiers
        if (this.notifierIDs) {
            for (let id of this.notifierIDs) {
                Zotero.Notifier.unregisterObserver(id);
            }
            this.notifierIDs = [];
        }
    },

    removeFromAllWindows() {
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            if (!win.ZoteroPane) continue;
            this.removeFromWindow(win);
        }
    },

    async updateMetadataFromNasaAds() {
        // Get the selected item in Zotero.
        let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
        if (selectedItems.length < 1) {
            Zotero.alert(null, "Zot-NASA-ADS", "Please select at least one item.");
            return;
        }

        // get API key
        let apiKey = Zotero.Prefs.get('extensions.zot-nasa-ads.api-key', true);

        for (let item of selectedItems) {
            let queryValue = this.getItemIdentifier(item);
            if (!queryValue) {
                Zotero.alert(null, "Zot-NASA-ADS", "No valid identifier found for item: " + item.getField('title'));
                continue;
            }
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
                    continue;
                }

                // Parse the response and update the item's metadata.
                let data = JSON.parse(response.responseText);
                if (data.response.docs.length === 0) {
                    Zotero.alert(null, "Zot-NASA-ADS", "No results found for the DOI.");
                    continue;
                }

                let adsData = data.response.docs[0];
                this.log(JSON.stringify(adsData))

                // Check that there is a non-arXiv result.
                if (adsData.doctype === 'eprint') {
                    Zotero.alert(null, "Zot-NASA-ADS", "No non-arXiv result found for the DOI.");
                    continue;
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
        }
    },

    async updatePdfFromNasaAds() {
        // Get the selected item in Zotero.
        let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
        if (selectedItems.length < 1) {
            Zotero.alert(null, "Zot-NASA-ADS", "Please select at least one item.");
            return;
        }

        // get API key
        let apiKey = Zotero.Prefs.get('extensions.zot-nasa-ads.api-key', true);

        for (let item of selectedItems) {
            let queryValue = this.getItemIdentifier(item);
            if (!queryValue) {
                Zotero.alert(null, "Zot-NASA-ADS", "No valid identifier found for item: " + item.getField('title'));
                continue;
            }
            let nasaAdsApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${queryValue}&fl=esources,bibcode&rows=1`;

            // Make the HTTP request to the NASA ADS API.
            try {
                let response = await Zotero.HTTP.request("GET", nasaAdsApiUrl, {
                    headers: {
                        "Authorization": "Bearer " + apiKey,
                    }
                });

                if (response.status !== 200) {
                    Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch data from NASA ADS.");
                    continue;
                }

                // Parse the response and update the item's metadata.
                let data = JSON.parse(response.responseText);

                if (data.response.docs.length === 0 || !data.response.docs[0].esources.includes('PUB_PDF')) {
                    Zotero.alert(null, "Zot-NASA-ADS", "Published PDF is not available for this item.");
                    continue;
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

                Zotero.alert(null, "Zot-NASA-ADS", "PDF downloaded and attached to the Zotero item.");
            } catch (error) {
                Zotero.alert(null, "Zot-NASA-ADS", "An error occurred: " + error.message);
            }
        }
    },

    async getCitationInfoFromNasaAds() {
        // Get the selected item in Zotero.
        let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
        if (selectedItems.length < 1) {
            Zotero.alert(null, "Zot-NASA-ADS", "Please select at least one item.");
            return;
        }

        // get API key
        let apiKey = Zotero.Prefs.get('extensions.zot-nasa-ads.api-key', true);

        for (let item of selectedItems) {
            // First get the bibcode for the item if not already available
            let bibcode = "";
            let extraField = item.getField('extra');
            let bibcodeMatch = extraField.match(/ADS Bibcode: (.*?)($|\n)/);
            
            if (bibcodeMatch) {
                bibcode = bibcodeMatch[1];
            } else {
                // We need to get the bibcode first
                let queryValue = this.getItemIdentifier(item);
                if (!queryValue) {
                    Zotero.alert(null, "Zot-NASA-ADS", "No valid identifier found for item: " + item.getField('title'));
                    continue;
                }
                
                try {
                    let bibcodeApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${queryValue}&fl=bibcode&rows=1`;
                    let response = await Zotero.HTTP.request("GET", bibcodeApiUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    if (response.status !== 200) {
                        Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch bibcode from NASA ADS.");
                        continue;
                    }

                    let data = JSON.parse(response.responseText);
                    if (data.response.docs.length === 0) {
                        Zotero.alert(null, "Zot-NASA-ADS", "No bibcode found for this item.");
                        continue;
                    }

                    bibcode = data.response.docs[0].bibcode;
                } catch (error) {
                    Zotero.alert(null, "Zot-NASA-ADS", "An error occurred while fetching bibcode: " + error.message);
                    continue;
                }
            }

            // Now get citation information using the bibcode
            if (bibcode) {
                try {
                    // Get basic citation count using the search/query API
                    let citationCountUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=bibcode:${bibcode}&fl=citation_count,bibcode&rows=1`;
                    
                    let citationCountResponse = await Zotero.HTTP.request("GET", citationCountUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    if (citationCountResponse.status !== 200) {
                        Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch citation count from NASA ADS.");
                        continue;
                    }

                    let citationCountData = JSON.parse(citationCountResponse.responseText);
                    let citationCount = 0;
                    if (citationCountData.response.docs.length > 0 && 
                        citationCountData.response.docs[0].citation_count !== undefined) {
                        citationCount = citationCountData.response.docs[0].citation_count;
                    }
                    
                    // Get refereed citation count with a specialized query
                    let refereedQuery = `citations(bibcode:${bibcode}) property:refereed`;
                    let refereedCountUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(refereedQuery)}&rows=0`;
                    
                    let refereedCountResponse = await Zotero.HTTP.request("GET", refereedCountUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    let refereedCount = 0;
                    if (refereedCountResponse.status === 200) {
                        let refereedData = JSON.parse(refereedCountResponse.responseText);
                        refereedCount = refereedData.response.numFound || 0;
                    }
                    
                    // Get recent citations (papers that cite this one)
                    let citationsUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=citations(bibcode:${bibcode})&fl=title,author,doi,bibcode,year,pub&rows=5&sort=date desc`;
                    
                    let citationsResponse = await Zotero.HTTP.request("GET", citationsUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    if (citationsResponse.status !== 200) {
                        Zotero.alert(null, "Zot-NASA-ADS", "Failed to fetch citations from NASA ADS.");
                        continue;
                    }

                    let citationsData = JSON.parse(citationsResponse.responseText);
                    
                    // Update the Extra field with citation information, preserving existing data
                    let extraLines = extraField.split('\n');
                    let citationUpdateFields = ['ADS Citation Count', 'ADS Refereed Citation Count', 'ADS Recent Citations'];
                    let newExtraLines = extraLines.filter(line => !citationUpdateFields.some(field => line.startsWith(field)));
                    
                    // Add citation counts
                    newExtraLines.push(`ADS Citation Count: ${citationCount}`);
                    newExtraLines.push(`ADS Refereed Citation Count: ${refereedCount}`);
                    
                    // Add recent citations information
                    if (citationsData.response.docs.length > 0) {
                        newExtraLines.push(`ADS Recent Citations:`);
                        citationsData.response.docs.forEach((cite, idx) => {
                            let authors = cite.author ? (cite.author.length > 3 ? 
                                           `${cite.author[0]} et al.` : 
                                           cite.author.join(', ')) : 'Unknown';
                            let journal = cite.pub || '';
                            let year = cite.year || '';
                            let title = cite.title && cite.title.length > 0 ? cite.title[0] : 'Untitled';
                            // Truncate long titles
                            if (title.length > 80) {
                                title = title.substring(0, 77) + '...';
                            }
                            newExtraLines.push(`  [${idx+1}] ${authors} (${year}) ${title} ${journal}`);
                        });
                    }
                    
                    // Update the Extra field
                    item.setField('extra', newExtraLines.join('\n'));
                    await item.saveTx();
                    
                    // Update the citation panel in all windows
                    let windows = Zotero.getMainWindows();
                    for (let win of windows) {
                        if (!win.ZoteroPane) continue;
                        this.updateCitationPanel(win);
                    }
                    
                    // 尝试切换到引用标签页，但添加错误处理
                    try {
                        // 获取活动窗口
                        let zoteroPane = Zotero.getActiveZoteroPane();
                        if (zoteroPane && zoteroPane.window) {
                            let activeWindow = zoteroPane.window;
                            // 尝试在不同位置寻找标签容器
                            let tabbox = activeWindow.document.getElementById('zotero-editpane-tabs');
                            if (!tabbox) {
                                // 尝试其他可能的ID
                                tabbox = activeWindow.document.getElementById('zotero-item-pane-content');
                                if (!tabbox) {
                                    // 尝试通过类名查找
                                    tabbox = activeWindow.document.querySelector('.item-pane-tabs');
                                }
                            }
                            
                            if (tabbox) {
                                // Zotero 6 风格
                                if (tabbox.tabs && tabbox.tabs.children) {
                                    // Find the index of our tab
                                    let tabs = tabbox.tabs.children;
                                    for (let i = 0; i < tabs.length; i++) {
                                        if (tabs[i].id === 'zot-nasa-ads-citations-tab') {
                                            tabbox.selectedIndex = i;
                                            break;
                                        }
                                    }
                                }
                                // Zotero 7 风格
                                else if (tabbox.querySelector) {
                                    // 尝试通过API或直接点击标签
                                    let tab = tabbox.querySelector('[data-tab-id="zot-nasa-ads-citations-tab"]');
                                    if (tab) {
                                        tab.click();
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // 如果切换标签失败，记录错误但不要影响主要功能
                        this.log("无法切换到引用标签页: " + e);
                    }
                    
                    Zotero.alert(null, "Zot-NASA-ADS", 
                        `引用信息已更新：\n` +
                        `总引用数：${citationCount}\n` +
                        `同行评审引用数：${refereedCount}\n` +
                        `最近引用论文数：${citationsData.response.numFound || 0}\n\n` +
                        `信息已添加到Extra字段，您可以在"NASA ADS引用"标签页中查看。`
                    );
                    
                } catch (error) {
                    Zotero.alert(null, "Zot-NASA-ADS", "An error occurred while fetching citation information: " + error.message);
                }
            }
        }
    },

    async getReferencesFromNasaAds() {
        // Get the selected item in Zotero.
        let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
        if (selectedItems.length < 1) {
            Zotero.alert(null, "Zot-NASA-ADS", "请选择至少一个条目。");
            return;
        }

        // get API key
        let apiKey = Zotero.Prefs.get('extensions.zot-nasa-ads.api-key', true);
        if (!apiKey) {
            Zotero.alert(null, "Zot-NASA-ADS", "请在Zotero首选项中设置NASA ADS API密钥。");
            return;
        }

        for (let item of selectedItems) {
            // First get the bibcode for the item if not already available
            let bibcode = "";
            let extraField = item.getField('extra');
            let bibcodeMatch = extraField.match(/ADS Bibcode: (.*?)($|\n)/);
            
            if (bibcodeMatch) {
                bibcode = bibcodeMatch[1];
            } else {
                // We need to get the bibcode first
                let queryValue = this.getItemIdentifier(item);
                if (!queryValue) {
                    Zotero.alert(null, "Zot-NASA-ADS", "未找到有效的标识符: " + item.getField('title'));
                    continue;
                }
                
                try {
                    let bibcodeApiUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${queryValue}&fl=bibcode&rows=1`;
                    let response = await Zotero.HTTP.request("GET", bibcodeApiUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    if (response.status !== 200) {
                        Zotero.alert(null, "Zot-NASA-ADS", "获取bibcode失败。");
                        continue;
                    }

                    let data = JSON.parse(response.responseText);
                    if (data.response.docs.length === 0) {
                        Zotero.alert(null, "Zot-NASA-ADS", "未找到bibcode。");
                        continue;
                    }

                    bibcode = data.response.docs[0].bibcode;
                } catch (error) {
                    Zotero.alert(null, "Zot-NASA-ADS", "获取bibcode时出错: " + error.message);
                    continue;
                }
            }

            // Now get reference information using the bibcode
            if (bibcode) {
                try {
                    // Get references using the 'references' operator in the search query
                    let referencesQuery = `references(bibcode:${bibcode})`;
                    let referencesUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(referencesQuery)}&fl=title,author,doi,bibcode,year,pub,volume,issue,page&rows=50&sort=year desc`;
                    
                    let referencesResponse = await Zotero.HTTP.request("GET", referencesUrl, {
                        headers: {
                            "Authorization": "Bearer " + apiKey,
                        }
                    });

                    if (referencesResponse.status !== 200) {
                        Zotero.alert(null, "Zot-NASA-ADS", "获取参考文献列表失败。");
                        continue;
                    }

                    let referencesData = JSON.parse(referencesResponse.responseText);
                    let referenceCount = referencesData.response.numFound || 0;
                    
                    if (referenceCount === 0) {
                        Zotero.alert(null, "Zot-NASA-ADS", "未找到参考文献信息。");
                        continue;
                    }
                    
                    // Update the Extra field with reference information, preserving existing data
                    let extraLines = extraField.split('\n');
                    let referenceUpdateFields = ['ADS References Count', 'ADS References List'];
                    let newExtraLines = extraLines.filter(line => !referenceUpdateFields.some(field => line.startsWith(field)));
                    
                    // Add reference count
                    newExtraLines.push(`ADS References Count: ${referenceCount}`);
                    
                    // Add reference list information (limited to 50 most recent)
                    let displayCount = Math.min(50, referencesData.response.docs.length);
                    if (displayCount > 0) {
                        newExtraLines.push(`ADS References List:`);
                        for (let i = 0; i < displayCount; i++) {
                            let ref = referencesData.response.docs[i];
                            let authors = ref.author ? (ref.author.length > 3 ? 
                                           `${ref.author[0]} et al.` : 
                                           ref.author.join(', ')) : 'Unknown';
                            let journal = ref.pub || '';
                            let year = ref.year || '';
                            let title = ref.title && ref.title.length > 0 ? ref.title[0] : 'Untitled';
                            let volume = ref.volume || '';
                            let issue = ref.issue ? `(${ref.issue})` : '';
                            let page = ref.page ? `${ref.page}` : '';
                            
                            // Truncate long titles
                            if (title.length > 80) {
                                title = title.substring(0, 77) + '...';
                            }
                            
                            let formattedJournal = '';
                            if (journal) {
                                formattedJournal = `${journal}`;
                                if (volume) formattedJournal += ` ${volume}`;
                                if (issue) formattedJournal += `${issue}`;
                                if (page) formattedJournal += `, ${page}`;
                            }
                            
                            newExtraLines.push(`  [${i+1}] ${authors} (${year}) ${title}. ${formattedJournal}`);
                        }
                    }
                    
                    // Update the Extra field
                    item.setField('extra', newExtraLines.join('\n'));
                    await item.saveTx();
                    
                    // Update the citation panel in all windows to reflect new reference data
                    let windows = Zotero.getMainWindows();
                    for (let win of windows) {
                        if (!win.ZoteroPane) continue;
                        this.updateCitationPanel(win);
                    }
                    
                    // 尝试切换到引用标签页，但添加错误处理
                    try {
                        // 获取活动窗口
                        let zoteroPane = Zotero.getActiveZoteroPane();
                        if (zoteroPane && zoteroPane.window) {
                            let activeWindow = zoteroPane.window;
                            // 尝试在不同位置寻找标签容器
                            let tabbox = activeWindow.document.getElementById('zotero-editpane-tabs');
                            if (!tabbox) {
                                // 尝试其他可能的ID
                                tabbox = activeWindow.document.getElementById('zotero-item-pane-content');
                                if (!tabbox) {
                                    // 尝试通过类名查找
                                    tabbox = activeWindow.document.querySelector('.item-pane-tabs');
                                }
                            }
                            
                            if (tabbox) {
                                // Zotero 6 风格
                                if (tabbox.tabs && tabbox.tabs.children) {
                                    // Find the index of our tab
                                    let tabs = tabbox.tabs.children;
                                    for (let i = 0; i < tabs.length; i++) {
                                        if (tabs[i].id === 'zot-nasa-ads-citations-tab') {
                                            tabbox.selectedIndex = i;
                                            break;
                                        }
                                    }
                                }
                                // Zotero 7 风格
                                else if (tabbox.querySelector) {
                                    // 尝试通过API或直接点击标签
                                    let tab = tabbox.querySelector('[data-tab-id="zot-nasa-ads-citations-tab"]');
                                    if (tab) {
                                        tab.click();
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // 如果切换标签失败，记录错误但不要影响主要功能
                        this.log("无法切换到引用标签页: " + e);
                    }
                    
                    Zotero.alert(null, "Zot-NASA-ADS", 
                        `参考文献信息已更新：\n` +
                        `总参考文献数：${referenceCount}\n` +
                        `已保存的条目数：${displayCount}\n\n` +
                        `信息已添加到Extra字段，您可以在"NASA ADS引用"标签页中查看。`
                    );
                    
                } catch (error) {
                    Zotero.alert(null, "Zot-NASA-ADS", "获取参考文献信息时出错: " + error.message);
                }
            }
        }
    },

    getItemIdentifier(item) {
        let doi = item.getField('DOI');
        // If a DOI is available, use it for the query
        if (doi) {
            queryValue = `doi:"${encodeURIComponent(doi)}"`;
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
        return queryValue;
    },

    // Register a new tab in the item details pane
    registerItemboxTab(window) {
        let doc = window.document;
        
        // Add debugging logs
        this.log("Attempting to register item box tab");
        
        // Find the itembox tabbox
        let tabbox = doc.getElementById('zotero-editpane-tabs');
        if (!tabbox) {
            // Zotero 7可能有不同的ID，尝试其他可能的ID
            tabbox = doc.getElementById('zotero-item-pane-content');
            if (!tabbox) {
                // 尝试通过类名查找
                tabbox = doc.querySelector('.item-pane-tabs');
                if (!tabbox) {
                    this.log("Cannot find the tab container in Zotero interface");
                    return;
                }
            }
            this.log("Found tab container with alternative selector");
        } else {
            this.log("Found tab container with ID: zotero-editpane-tabs");
        }
        
        // 尝试查找tabs和tabpanels元素
        let tabs = tabbox.querySelector('tabs') || tabbox.tabs;
        let tabpanels = tabbox.querySelector('tabpanels') || tabbox.tabpanels;
        
        if (!tabs || !tabpanels) {
            this.log("Cannot find tabs or tabpanels elements");
            // 在Zotero 7中，可能需要不同的创建方式
            try {
                // 尝试使用Zotero 7的API创建标签页
                if (Zotero.ItemPane && typeof Zotero.ItemPane.registerTab === 'function') {
                    this.log("Using Zotero.ItemPane.registerTab API");
                    Zotero.ItemPane.registerTab({
                        id: 'zot-nasa-ads-citations-tab',
                        label: 'NASA ADS引用',
                        requiredDataType: 'item',
                        onShow: (item) => {
                            this.updateCitationPanel(window, item);
                        }
                    });
                    return;
                }
            } catch (e) {
                this.log("Error registering tab with Zotero.ItemPane API: " + e);
            }
            return;
        }
        
        this.log("Found tabs and tabpanels elements");
        
        // Create a new tab
        let citationsTab = doc.createXULElement('tab');
        citationsTab.id = 'zot-nasa-ads-citations-tab';
        citationsTab.setAttribute('label', 'NASA ADS引用');
        tabs.appendChild(citationsTab);
        this.storeAddedElement(citationsTab);
        
        // Create the tab panel
        let citationsPanel = doc.createXULElement('tabpanel');
        citationsPanel.id = 'zot-nasa-ads-citations-panel';
        citationsPanel.setAttribute('flex', '1');
        
        // Create a container for the citation data
        let container = doc.createXULElement('vbox');
        container.id = 'zot-nasa-ads-citations-container';
        container.setAttribute('flex', '1');
        
        // Create a placeholder message
        let placeholder = doc.createXULElement('description');
        placeholder.textContent = '选择一个条目并使用右键菜单中的"Get Citation Information from NASA ADS"获取引用信息。';
        container.appendChild(placeholder);
        
        citationsPanel.appendChild(container);
        tabpanels.appendChild(citationsPanel);
        this.storeAddedElement(citationsPanel);
        
        this.log("Tab registration complete");
    },
    
    // Register an observer to update the citation panel when items are selected
    registerItemSelectionObserver(window) {
        let notifierID = Zotero.Notifier.registerObserver({
            notify: async (event, type, ids, extraData) => {
                if (type === 'item' && event === 'select') {
                    this.updateCitationPanel(window);
                }
            }
        }, ['item']);
        
        // Store the notifier ID for cleanup
        this.notifierIDs = this.notifierIDs || [];
        this.notifierIDs.push(notifierID);
    },
    
    // 更新函数以处理DOM元素创建的兼容性问题
    createDomElement(doc, type, attributes = {}, text = null) {
        let elem;
        try {
            // 尝试使用XUL元素创建（旧版Zotero）
            elem = doc.createXULElement(type);
        } catch (e) {
            // 回退到创建HTML元素（Zotero 7）
            elem = doc.createElement(type === 'vbox' ? 'div' : type);
            if (type === 'vbox' || type === 'hbox') {
                elem.className = type;
                elem.style.display = 'flex';
                elem.style.flexDirection = type === 'vbox' ? 'column' : 'row';
            }
        }
        
        // 设置属性
        for (let [key, value] of Object.entries(attributes)) {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(elem.style, value);
            } else if (key === 'className' || key === 'class') {
                elem.className = value;
            } else {
                elem.setAttribute(key, value);
            }
        }
        
        // 设置文本内容
        if (text !== null) {
            elem.textContent = text;
        }
        
        return elem;
    },

    // Update the citation panel with data from the selected item
    updateCitationPanel(window, specificItem = null) {
        let doc = window.document;
        this.log("Updating citation panel");
        
        // Find container element regardless of how it was created
        let container = doc.getElementById('zot-nasa-ads-citations-container');
        if (!container) {
            // Try to find container in Zotero 7 structure
            container = doc.querySelector('[data-tab-id="zot-nasa-ads-citations-tab"] .content');
            if (!container) {
                this.log("Citation container not found");
                return;
            }
        }
        
        // Clear the container
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // Get the item to display
        let item = specificItem;
        if (!item) {
            let selectedItems = Zotero.getActiveZoteroPane().getSelectedItems();
            if (!selectedItems || selectedItems.length === 0) {
                let placeholder = this.createDomElement(doc, 'description', {}, '请选择一个条目查看信息。');
                container.appendChild(placeholder);
                return;
            }
            item = selectedItems[0];
        }
        
        let extraField = item.getField('extra');
        
        // Create tab container for citations/references
        let tabContainer = this.createDomElement(doc, 'div', {
            className: 'nasa-ads-tabs',
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%'
            }
        });
        
        // Create tab buttons
        let tabButtons = this.createDomElement(doc, 'div', {
            className: 'nasa-ads-tab-buttons',
            style: {
                display: 'flex',
                borderBottom: '1px solid #ccc',
                marginBottom: '10px'
            }
        });
        
        // Citation tab button
        let citationTabButton = this.createDomElement(doc, 'button', {
            className: 'nasa-ads-tab-button active',
            style: {
                padding: '8px 16px',
                margin: '0 2px 0 0',
                border: '1px solid #ccc',
                borderBottom: 'none',
                backgroundColor: '#f0f0f0',
                cursor: 'pointer'
            }
        }, '引用信息 (Citations)');
        
        // References tab button
        let referencesTabButton = this.createDomElement(doc, 'button', {
            className: 'nasa-ads-tab-button',
            style: {
                padding: '8px 16px',
                margin: '0',
                border: '1px solid #ccc',
                borderBottom: 'none',
                backgroundColor: '#e0e0e0',
                cursor: 'pointer'
            }
        }, '参考文献 (References)');
        
        // Add buttons to container
        tabButtons.appendChild(citationTabButton);
        tabButtons.appendChild(referencesTabButton);
        tabContainer.appendChild(tabButtons);
        
        // Create content containers
        let citationContent = this.createDomElement(doc, 'div', {
            className: 'nasa-ads-tab-content citation-content',
            style: {
                display: 'block', // Initially visible
                padding: '10px',
                overflowY: 'auto',
                flex: '1'
            }
        });
        
        let referencesContent = this.createDomElement(doc, 'div', {
            className: 'nasa-ads-tab-content references-content',
            style: {
                display: 'none', // Initially hidden
                padding: '10px',
                overflowY: 'auto',
                flex: '1'
            }
        });
        
        // Add content containers to tab container
        tabContainer.appendChild(citationContent);
        tabContainer.appendChild(referencesContent);
        
        // Add tab container to main container
        container.appendChild(tabContainer);
        
        // Add click event listeners for tab buttons
        citationTabButton.addEventListener('click', () => {
            citationTabButton.style.backgroundColor = '#f0f0f0';
            referencesTabButton.style.backgroundColor = '#e0e0e0';
            citationContent.style.display = 'block';
            referencesContent.style.display = 'none';
        });
        
        referencesTabButton.addEventListener('click', () => {
            citationTabButton.style.backgroundColor = '#e0e0e0';
            referencesTabButton.style.backgroundColor = '#f0f0f0';
            citationContent.style.display = 'none';
            referencesContent.style.display = 'block';
        });
        
        // Check if the item has citation information
        let hasCitationInfo = extraField.includes('ADS Citation Count:');
        let hasReferencesInfo = extraField.includes('ADS References Count:');
        
        // ===== POPULATE CITATION CONTENT =====
        if (!hasCitationInfo) {
            let placeholder = this.createDomElement(doc, 'description', {}, '该条目尚未获取引用信息。请使用右键菜单中的"Get Citation Information from NASA ADS"获取。');
            citationContent.appendChild(placeholder);
            
            // Add a button to get citation info
            let button = this.createDomElement(doc, 'button', { label: '获取引用信息' });
            button.addEventListener('click', () => {
                this.getCitationInfoFromNasaAds();
            });
            citationContent.appendChild(button);
        } else {
            // Extract citation information from Extra field
            let citationCount = extraField.match(/ADS Citation Count: (\d+)/);
            let refereedCount = extraField.match(/ADS Refereed Citation Count: (\d+)/);
            
            // Create stats container
            let statsContainer = this.createDomElement(doc, 'div', { 
                className: 'citation-stats',
                style: { 
                    display: 'flex', 
                    flexDirection: 'column',
                    marginBottom: '15px'
                }
            });
            
            // Add total citation count
            if (citationCount) {
                let countRow = this.createDomElement(doc, 'div', {
                    style: { 
                        display: 'flex',
                        marginBottom: '5px' 
                    }
                });
                
                let label = this.createDomElement(doc, 'span', {
                    style: { 
                        fontWeight: 'bold',
                        marginRight: '10px'
                    }
                }, '总引用数：');
                
                let value = this.createDomElement(doc, 'span', {}, citationCount[1]);
                
                countRow.appendChild(label);
                countRow.appendChild(value);
                statsContainer.appendChild(countRow);
            }
            
            // Add refereed citation count
            if (refereedCount) {
                let countRow = this.createDomElement(doc, 'div', {
                    style: { 
                        display: 'flex',
                        marginBottom: '5px' 
                    }
                });
                
                let label = this.createDomElement(doc, 'span', {
                    style: { 
                        fontWeight: 'bold',
                        marginRight: '10px'
                    }
                }, '同行评审引用数：');
                
                let value = this.createDomElement(doc, 'span', {}, refereedCount[1]);
                
                countRow.appendChild(label);
                countRow.appendChild(value);
                statsContainer.appendChild(countRow);
            }
            
            citationContent.appendChild(statsContainer);
            
            // Display recent citations
            let recentCitationsMatch = extraField.match(/ADS Recent Citations:([\s\S]*?)(\n\n|\n$|$)/);
            if (recentCitationsMatch) {
                let citationsHeader = this.createDomElement(doc, 'div', {
                    style: {
                        fontWeight: 'bold',
                        marginTop: '10px',
                        marginBottom: '10px',
                        fontSize: '1.1em'
                    }
                }, '最近引用论文：');
                
                citationContent.appendChild(citationsHeader);
                
                let citations = recentCitationsMatch[1].trim().split('\n');
                
                // Create a list of recent citations
                let list = this.createDomElement(doc, 'div', {
                    className: 'citations-list',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        marginLeft: '10px'
                    }
                });
                
                citations.forEach(citation => {
                    let item = this.createDomElement(doc, 'div', {
                        style: {
                            marginBottom: '8px'
                        }
                    }, citation.trim());
                    list.appendChild(item);
                });
                
                citationContent.appendChild(list);
            }
            
            // Add a link to view on ADS
            let bibcodeMatch = extraField.match(/ADS Bibcode: (.*?)($|\n)/);
            if (bibcodeMatch) {
                let linkContainer = this.createDomElement(doc, 'div', {
                    style: {
                        marginTop: '15px',
                        marginBottom: '15px'
                    }
                });
                
                let link = this.createDomElement(doc, 'a', {
                    href: `https://ui.adsabs.harvard.edu/abs/${bibcodeMatch[1]}/citations`,
                    className: 'text-link',
                    style: {
                        color: '#0000FF',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }
                }, '在NASA ADS查看更多引用信息');
                
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    Zotero.launchURL(`https://ui.adsabs.harvard.edu/abs/${bibcodeMatch[1]}/citations`);
                });
                
                linkContainer.appendChild(link);
                citationContent.appendChild(linkContainer);
            }
            
            // Add a button to refresh citation info
            let refreshButton = this.createDomElement(doc, 'button', {
                label: '刷新引用信息',
                style: {
                    marginTop: '10px'
                }
            });
            
            refreshButton.addEventListener('click', () => {
                this.getCitationInfoFromNasaAds();
            });
            
            citationContent.appendChild(refreshButton);
        }
        
        // ===== POPULATE REFERENCES CONTENT =====
        if (!hasReferencesInfo) {
            let placeholder = this.createDomElement(doc, 'description', {}, '该条目尚未获取参考文献列表。请使用右键菜单中的"Get References from NASA ADS"获取。');
            referencesContent.appendChild(placeholder);
            
            // Add a button to get references info
            let button = this.createDomElement(doc, 'button', { label: '获取参考文献' });
            button.addEventListener('click', () => {
                this.getReferencesFromNasaAds();
            });
            referencesContent.appendChild(button);
        } else {
            // Extract references information from Extra field
            let referencesCount = extraField.match(/ADS References Count: (\d+)/);
            
            // Create stats container
            let statsContainer = this.createDomElement(doc, 'div', { 
                className: 'references-stats',
                style: { 
                    display: 'flex', 
                    flexDirection: 'column',
                    marginBottom: '15px'
                }
            });
            
            // Add total references count
            if (referencesCount) {
                let countRow = this.createDomElement(doc, 'div', {
                    style: { 
                        display: 'flex',
                        marginBottom: '5px' 
                    }
                });
                
                let label = this.createDomElement(doc, 'span', {
                    style: { 
                        fontWeight: 'bold',
                        marginRight: '10px'
                    }
                }, '参考文献数量：');
                
                let value = this.createDomElement(doc, 'span', {}, referencesCount[1]);
                
                countRow.appendChild(label);
                countRow.appendChild(value);
                statsContainer.appendChild(countRow);
            }
            
            referencesContent.appendChild(statsContainer);
            
            // Display references list
            let referencesListMatch = extraField.match(/ADS References List:([\s\S]*?)(\n\n|\n$|$)/);
            if (referencesListMatch) {
                let referencesHeader = this.createDomElement(doc, 'div', {
                    style: {
                        fontWeight: 'bold',
                        marginTop: '10px',
                        marginBottom: '10px',
                        fontSize: '1.1em'
                    }
                }, '参考文献列表：');
                
                referencesContent.appendChild(referencesHeader);
                
                let references = referencesListMatch[1].trim().split('\n');
                
                // Create a list of references
                let list = this.createDomElement(doc, 'div', {
                    className: 'references-list',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        marginLeft: '10px'
                    }
                });
                
                references.forEach(reference => {
                    let item = this.createDomElement(doc, 'div', {
                        style: {
                            marginBottom: '8px'
                        }
                    }, reference.trim());
                    list.appendChild(item);
                });
                
                referencesContent.appendChild(list);
            }
            
            // Add a link to view on ADS
            let bibcodeMatch = extraField.match(/ADS Bibcode: (.*?)($|\n)/);
            if (bibcodeMatch) {
                let linkContainer = this.createDomElement(doc, 'div', {
                    style: {
                        marginTop: '15px',
                        marginBottom: '15px'
                    }
                });
                
                let link = this.createDomElement(doc, 'a', {
                    href: `https://ui.adsabs.harvard.edu/abs/${bibcodeMatch[1]}/references`,
                    className: 'text-link',
                    style: {
                        color: '#0000FF',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                    }
                }, '在NASA ADS查看完整参考文献列表');
                
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    Zotero.launchURL(`https://ui.adsabs.harvard.edu/abs/${bibcodeMatch[1]}/references`);
                });
                
                linkContainer.appendChild(link);
                referencesContent.appendChild(linkContainer);
            }
            
            // Add a button to refresh references info
            let refreshButton = this.createDomElement(doc, 'button', {
                label: '刷新参考文献',
                style: {
                    marginTop: '10px'
                }
            });
            
            refreshButton.addEventListener('click', () => {
                this.getReferencesFromNasaAds();
            });
            
            referencesContent.appendChild(refreshButton);
        }
    },
}