#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取测试目录中的所有测试文件
const testDir = path.join(__dirname);
const testFiles = fs.readdirSync(testDir)
    .filter(file => file.startsWith('test-') && file.endsWith('.js') && file !== 'test-setup.js' && file !== 'test-helpers.js');

console.log('运行Zot-NASA-ADS插件单元测试');
console.log('==================================');

// 运行每个测试文件
let passedTests = 0;
let failedTests = 0;
let testResults = [];

for (const testFile of testFiles) {
    console.log(`\n运行测试文件: ${testFile}`);
    try {
        const output = execSync(`node ${path.join(testDir, testFile)}`, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        console.log(output);
        console.log(`✅ ${testFile} 测试通过`);
        testResults.push({ file: testFile, status: 'passed', output });
        passedTests++;
    } catch (error) {
        console.error(`❌ ${testFile} 测试失败`);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        testResults.push({ 
            file: testFile, 
            status: 'failed', 
            output: error.stdout || '', 
            error: error.stderr || error.message || 'Unknown error' 
        });
        failedTests++;
    }
}

console.log('\n==================================');
console.log(`测试结果摘要: ${passedTests} 通过, ${failedTests} 失败`);

// 如果有失败的测试，显示摘要
if (failedTests > 0) {
    console.log('\n失败测试的错误摘要:');
    testResults.filter(r => r.status === 'failed').forEach(result => {
        console.log(`\n${result.file}:`);
        const errorLines = result.error.split('\n')
            .filter(line => line.trim() && !line.includes('at Module._compile'))
            .slice(0, 5); // 只显示前5行错误信息，避免过多堆栈
        console.log(errorLines.join('\n'));
    });
}

// 如果有任何测试失败，退出代码为1
process.exit(failedTests > 0 ? 1 : 0); 