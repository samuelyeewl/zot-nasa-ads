// Zotero模拟环境设置

// 初始化全局Zotero对象
var Zotero = {
    debug: function(msg) {
        console.log(msg);
    },
    
    // 模拟Zotero.Prefs
    Prefs: {
        get: function(pref) {
            return this._prefs[pref] || null;
        },
        set: function(pref, value) {
            this._prefs[pref] = value;
        },
        _prefs: {
            'extensions.zot-nasa-ads.api-key': 'test-api-key'
        }
    },

    // 模拟Zotero.getActiveZoteroPane
    getActiveZoteroPane: function() {
        return {
            getSelectedItems: function() {
                return this._selectedItems || [];
            },
            setSelectedItems: function(items) {
                this._selectedItems = items;
            },
            _selectedItems: []
        };
    },

    // 模拟Zotero.HTTP
    HTTP: {
        request: async function(method, url, options) {
            // 记录请求，以便测试可以验证
            this.lastRequest = { method, url, options };
            
            // 返回模拟响应
            return this._mockResponses[url] || {
                status: 404,
                responseText: JSON.stringify({ error: 'Not found' })
            };
        },
        // 用于测试中设置模拟响应
        setMockResponse: function(url, response) {
            this._mockResponses[url] = response;
        },
        _mockResponses: {}
    },

    // 模拟Zotero.alert
    alert: function(window, title, message) {
        this.lastAlert = { title, message };
        console.log(`Alert: ${title} - ${message}`);
    },

    // 模拟Zotero.ItemTypes
    ItemTypes: {
        getID: function(type) {
            const types = {
                'journalArticle': 4,
                'preprint': 20
            };
            return types[type] || 0;
        }
    },

    // 模拟Zotero.getMainWindows
    getMainWindows: function() {
        return this._mockWindows || [];
    },

    // 添加模拟窗口以便测试
    addMockWindow: function() {
        if (!this._mockWindows) {
            this._mockWindows = [];
        }
        const window = new MockWindow();
        this._mockWindows.push(window);
        return window;
    },

    // 模拟Zotero.getWindowManager
    getWindowManager: function() {
        return {
            registerChrome: function(onLoad, onUnload) {
                this.onLoad = onLoad;
                this.onUnload = onUnload;
                return {
                    destruct: function() {}
                };
            }
        };
    }
};

// 模拟Services.scriptloader
var Services = {
    scriptloader: {
        loadSubScript: function(uri) {
            console.log(`Loading script: ${uri}`);
        }
    }
};

// 模拟一个Zotero条目
class MockZoteroItem {
    constructor(data = {}) {
        this.fields = {
            title: data.title || 'Test Title',
            DOI: data.DOI || '10.1000/test',
            extra: data.extra || '',
            abstractNote: data.abstractNote || '',
            publicationTitle: data.publicationTitle || '',
            journalAbbreviation: data.journalAbbreviation || '',
            volume: data.volume || '',
            issue: data.issue || '',
            pages: data.pages || '',
            date: data.date || '',
            ISSN: data.ISSN || '',
            url: data.url || ''
        };
        this.creators = data.creators || [];
        this.itemTypeID = data.itemTypeID || 4; // 默认为journalArticle
        this.attachments = data.attachments || [];
    }

    getField(field) {
        return this.fields[field] || '';
    }

    setField(field, value) {
        this.fields[field] = value;
    }

    getCreators() {
        return this.creators;
    }

    setCreators(creators) {
        this.creators = creators;
    }

    setType(typeID) {
        this.itemTypeID = typeID;
    }

    async saveTx() {
        // 模拟保存操作
        return true;
    }
}

// 模拟document和window对象
class MockElement {
    constructor(tag) {
        this.tagName = tag;
        this.id = '';
        this.attributes = {};
        this.children = [];
        this.eventListeners = {};
        this.textContent = '';
        this.removed = false;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    getAttribute(name) {
        return this.attributes[name] || null;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    remove() {
        this.removed = true; // 标记为已移除
    }
    
    // 模拟触发事件
    dispatchEvent(eventType) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(listener => {
                listener();
            });
        }
    }
}

class MockDocument {
    constructor() {
        this.elements = {};
    }

    createXULElement(tag) {
        return new MockElement(tag);
    }

    getElementById(id) {
        return this.elements[id] || null;
    }

    // 用于测试初始化
    addElement(id, element) {
        this.elements[id] = element;
    }
}

class MockWindow {
    constructor() {
        this.document = new MockDocument();
        this.ZoteroPane = true;
    }
}

// 导出模拟对象以便测试使用
module.exports = {
    Zotero,
    Services,
    MockZoteroItem,
    MockDocument,
    MockElement,
    MockWindow
}; 