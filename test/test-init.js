// 测试插件初始化功能

// 导入测试设置和辅助函数
const { Zotero, Services, MockZoteroItem } = require('./test-setup');
const { Assert, runTestSuite } = require('./test-helpers');

// 将模拟对象设为全局变量 - 必须在加载插件代码之前设置
global.Zotero = Zotero;
global.Services = Services;

// 加载插件的主代码
require('../zot-nasa-ads.js');

// 测试套件
runTestSuite('初始化功能测试', {
    '插件应该能够正确初始化': function() {
        // 确保加载脚本后ZotNasaAds存在
        Assert.ok(global.ZotNasaAds, '全局ZotNasaAds对象应该存在');
        
        // 调用init方法
        const testParams = { 
            id: 'zot-nasa-ads@zot.nasa.ads', 
            version: '0.5.0', 
            rootURI: 'file:///test/' 
        };
        
        ZotNasaAds.init(testParams);
        
        // 检查初始化后的状态
        Assert.equal(ZotNasaAds.id, testParams.id, 'id应该已被设置');
        Assert.equal(ZotNasaAds.version, testParams.version, 'version应该已被设置');
        Assert.equal(ZotNasaAds.rootURI, testParams.rootURI, 'rootURI应该已被设置');
        Assert.true(ZotNasaAds.initialized, 'initialized标志应该为true');
    },
    
    '重复初始化不应该改变状态': function() {
        // 先确保插件已初始化
        Assert.true(ZotNasaAds.initialized, '插件应该已初始化');
        
        // 记录当前状态
        const currentId = ZotNasaAds.id;
        const currentVersion = ZotNasaAds.version;
        const currentRootURI = ZotNasaAds.rootURI;
        
        // 调用init方法，使用不同的参数
        const newParams = { 
            id: 'different-id', 
            version: '9.9.9', 
            rootURI: 'file:///different/' 
        };
        
        ZotNasaAds.init(newParams);
        
        // 检查状态不应该改变
        Assert.equal(ZotNasaAds.id, currentId, 'id不应该改变');
        Assert.equal(ZotNasaAds.version, currentVersion, 'version不应该改变');
        Assert.equal(ZotNasaAds.rootURI, currentRootURI, 'rootURI不应该改变');
    },
    
    '插件应该能够正确记录添加的元素': function() {
        // 清空已添加元素列表
        ZotNasaAds.addedElementIDs = [];
        
        // 创建测试元素
        const testElement = { id: 'test-element-id' };
        
        // 添加元素
        ZotNasaAds.storeAddedElement(testElement);
        
        // 检查元素是否已记录
        Assert.equal(ZotNasaAds.addedElementIDs.length, 1, '应该有一个元素被记录');
        Assert.equal(ZotNasaAds.addedElementIDs[0], 'test-element-id', '元素ID应该被正确记录');
        
        // 测试没有ID的元素应该抛出错误
        Assert.throws(
            () => ZotNasaAds.storeAddedElement({}),
            Error,
            '添加没有ID的元素应该抛出错误'
        );
    },
    
    '插件应该能够获取日志': function() {
        // 创建一个临时变量保存Zotero.debug调用
        const originalDebug = Zotero.debug;
        let lastDebugMsg = null;
        
        // 重写debug方法以捕获消息
        Zotero.debug = function(msg) {
            lastDebugMsg = msg;
        };
        
        // 调用log方法
        ZotNasaAds.log('测试消息');
        
        // 检查消息是否正确
        Assert.equal(lastDebugMsg, 'zot-nasa-ads: 测试消息', '日志消息应该被正确格式化');
        
        // 恢复原始debug方法
        Zotero.debug = originalDebug;
    }
}); 