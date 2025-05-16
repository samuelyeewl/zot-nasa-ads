# Zotero NASA ADS Metadata Updater

This Zotero plugin allows one to update the Zotero metadata, download a publisher PDF, and retrieve citation information for a given paper based on a query to the [SAO/NASA Astrophysics Data System](https://ui.adsabs.harvard.edu/) database. This is particularly useful to update papers that were first added to Zotero from the arXiv with their published versions.

## Usage
- First, obtain a NASA ADS API Key by going to [this page](https://ui.adsabs.harvard.edu/help/api/) and logging in.
- Enter the API Key by going to Zot-NASA-ADS section of the Preferences pane.
- Right click an item and select "Update Metadata from NASA ADS" to query the NASA ADS database using either the DOI (preferred) or arXiv number. The plugin retrieves all the necessary information from the server, including the [NASA ADS Bibcodes](https://ui.adsabs.harvard.edu/help/actions/bibcode) and ADS URLs, which are stored in the "extra" field and can be accessed by Better BibTeX.
- Selecting "Download Publisher PDF from NASA ADS" uses the ADS API to redirect to the publisher PDF. This will fail if you do not have access to the PDF (e.g., through a VPN or on-campus access for non-Open Access articles).
- Selecting "Get Citation Information from NASA ADS" retrieves citation metrics and recent citations for the paper. This includes total citation count, refereed citation count, and details of the 5 most recent papers citing this work. The information is stored in the "extra" field.
- Selecting "Get References from NASA ADS" 获取论文的参考文献列表，包括最多50条最新的参考文献详细信息。
- 引用信息和参考文献会显示在条目详情面板中的"NASA ADS引用"标签页中。标签页内有"引用信息(Citations)"和"参考文献(References)"两个子标签页，可以分别查看被引用信息和参考文献列表。

## Features
- Update paper metadata (title, authors, journal, volume, etc.) from NASA ADS
- Download publisher PDFs (when available) from NASA ADS
- Retrieve citation metrics (citation count, refereed citation count)
- Get recent citations to a paper with author and title information
- Retrieve references list (up to 50 references) with full bibliographic details
- Store ADS Bibcodes for use with Better BibTeX
- View citation information and references directly in Zotero's interface in a dedicated "NASA ADS引用" tab

## Viewing Citation and Reference Information
在Zotero界面中查看引用信息和参考文献：
1. 选择一篇论文条目
2. 在右侧详情面板中点击"NASA ADS引用"标签页
3. 默认显示"引用信息(Citations)"子标签页，可以点击"参考文献(References)"切换到参考文献列表视图
4. 如果尚未获取信息，可以点击相应标签页中的"获取引用信息"或"获取参考文献"按钮
5. 引用列表会显示最近5篇引用当前论文的文献，包括作者、标题和期刊信息
6. 参考文献列表会显示当前论文引用的最多50篇文献，包括作者、标题、期刊和年份等信息
7. 点击"在NASA ADS查看更多引用信息"或"在NASA ADS查看完整参考文献列表"可跳转到NASA ADS网站查看完整列表
8. 点击"刷新引用信息"或"刷新参考文献"按钮可更新相应数据

## Caveats
- PDF download may fail due to hitting a Captcha.
- Citation information requires a valid ADS Bibcode, which is obtained automatically when updating metadata.
- 参考文献列表最多只显示50条，查看完整列表请使用NASA ADS网站

## Installation

### 直接安装
1. 从[GitHub Releases页面](https://github.com/samuelyeewl/zot-nasa-ads/releases)下载最新的`.xpi`文件
2. 在Zotero中打开"工具"菜单，选择"插件"
3. 点击齿轮图标，选择"从文件安装附加组件..."
4. 选择下载的`.xpi`文件
5. 重启Zotero

### 手动打包安装
如果您想自己打包插件：
1. 克隆或下载此仓库到本地
2. 将所有文件（不包括`.git`文件夹）压缩成一个ZIP文件
3. 将文件扩展名从`.zip`改为`.xpi`
4. 按照直接安装的步骤4-5安装插件

## 故障排除

### "NASA ADS引用"标签页不显示
如果在安装插件后没有看到"NASA ADS引用"标签页，请尝试以下步骤：

1. **重启Zotero**：完全关闭Zotero并重新启动
2. **检查插件是否正确安装**：在Zotero的"工具 > 插件"菜单中，确认Zot-NASA-ADS插件已启用
3. **清除Zotero缓存**：
   - 关闭Zotero
   - 找到Zotero配置文件夹（通常在`%APPDATA%\Zotero\Zotero\Profiles`（Windows）或`~/Library/Application Support/Zotero/Profiles`（Mac））
   - 删除`extensions.json`和`extensions.sqlite`文件
   - 重启Zotero
4. **尝试使用右键菜单**：即使标签页不可见，您仍然可以通过选择条目，右键点击并选择"Get Citation Information from NASA ADS"或"Get References from NASA ADS"来获取信息

### Zotero 7兼容性
此插件已更新以支持Zotero 7.0，但UI可能在不同版本间略有差异。如果遇到问题：

1. 确保使用最新版本的插件（当前v0.5.0）
2. 对于Zotero 7用户，如果标签页不可见，可以尝试查看不同的部分，因为Zotero 7的UI结构与之前版本有所不同
3. 如果在更新到Zotero 7后遇到问题，可以尝试卸载并重新安装插件

## License

Distributed under version 3 of the GNU Affero General Public License (AGPL).

## 开发与测试

### 开发环境设置
如果您想为此项目贡献代码，请按照以下步骤设置开发环境：

1. 克隆此仓库到本地：
   ```
   git clone https://github.com/samuelyeewl/zot-nasa-ads.git
   cd zot-nasa-ads
   ```

2. 在Zotero中加载开发版本：
   - 使用符号链接将项目目录链接到Zotero扩展目录
   - 或使用`build.sh`脚本创建安装文件并手动加载

### 单元测试框架
插件包含完整的单元测试框架，使用纯JavaScript实现，不依赖外部测试库。测试框架包括：

1. **测试设置模拟（test-setup.js）**：
   - 模拟Zotero API环境
   - 提供MockZoteroItem、MockDocument和MockElement等模拟类
   - 模拟HTTP请求和响应

2. **测试辅助工具（test-helpers.js）**：
   - 提供断言库（Assert）用于验证结果
   - 提供测试运行器用于执行测试套件

3. **测试运行器（run-tests.js）**：
   - 自动发现和运行test目录中的所有测试文件
   - 生成测试报告，显示通过和失败的测试

### 运行单元测试
执行以下命令运行所有测试：
```
./build.sh test
```

测试运行器将自动发现并执行test目录下所有以"test-"开头并以".js"结尾的文件（除test-setup.js和test-helpers.js外）。

### 当前测试套件
测试套件覆盖插件的主要功能：

1. **初始化测试（test-init.js）**：
   - 验证插件能正确初始化
   - 测试重复初始化的行为
   - 验证元素记录功能
   - 测试日志记录功能

2. **元数据更新测试（test-metadata-update.js）**：
   - 测试没有选定项时的错误处理
   - 验证项目没有DOI时的错误处理
   - 测试元数据更新功能
   - 验证API错误的处理
   - 测试没有结果时的错误处理

3. **UI元素测试（test-ui-elements.js）**：
   - 测试向窗口添加UI元素
   - 验证从窗口移除UI元素
   - 测试菜单项点击响应
   - 验证DOM元素创建功能
   - 测试多窗口环境中的UI处理

### 添加新测试
要添加新的测试：

1. 在`test`目录创建新的测试文件，命名为`test-[功能名].js`
2. 导入测试设置和辅助函数：
   ```javascript
   const { Zotero, Services, MockZoteroItem } = require('./test-setup');
   const { Assert, runTestSuite } = require('./test-helpers');
   ```

3. 设置全局变量并加载插件代码：
   ```javascript
   global.Zotero = Zotero;
   global.Services = Services;
   ```

4. 创建测试套件：
   ```javascript
   runTestSuite('测试套件名称', {
       '测试用例1': function() {
           // 编写测试代码
           Assert.ok(true, '测试成功');
       },
       '测试用例2': async function() {
           // 异步测试代码
           const result = await someAsyncFunction();
           Assert.equal(result, expectedValue, '结果应该匹配');
       }
   });
   ```

5. 运行测试验证结果：
   ```
   ./build.sh test
   ```

### 测试最佳实践
1. **独立测试**：每个测试应该独立运行，不依赖其他测试的执行结果
2. **模拟外部依赖**：对外部API调用使用模拟响应
3. **清理状态**：每个测试结束后恢复修改过的函数和状态
4. **明确断言消息**：为每个断言提供清晰的错误消息
5. **测试错误情况**：不仅测试正常路径，还要测试错误处理

### 调试测试
如果测试失败，测试运行器会显示详细的错误信息和堆栈跟踪。您可以：

1. 在测试代码中添加`console.log()`语句输出调试信息
2. 修改`test-helpers.js`中的断言函数以提供更详细的错误信息
3. 单独运行特定测试文件：`node test/test-specific-file.js`

### 持续集成
欢迎贡献者为此项目添加CI工作流，例如GitHub Actions，以自动运行测试并确保代码质量。