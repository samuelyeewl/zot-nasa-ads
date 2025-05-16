// 简单的断言库
class Assert {
    static equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `断言失败: 期望 ${expected}, 实际得到 ${actual}`);
        }
    }

    static deepEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        
        if (actualStr !== expectedStr) {
            throw new Error(message || `断言失败: 期望 ${expectedStr}, 实际得到 ${actualStr}`);
        }
    }

    static notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `断言失败: 期望不等于 ${expected}`);
        }
    }

    static true(value, message) {
        if (value !== true) {
            throw new Error(message || `断言失败: 期望为true, 实际得到 ${value}`);
        }
    }

    static false(value, message) {
        if (value !== false) {
            throw new Error(message || `断言失败: 期望为false, 实际得到 ${value}`);
        }
    }

    static ok(value, message) {
        if (!value) {
            throw new Error(message || `断言失败: 期望为真值`);
        }
    }

    static throws(fn, expectedError, message) {
        try {
            fn();
            throw new Error(message || `断言失败: 期望抛出错误，但没有抛出`);
        } catch (e) {
            if (expectedError && !(e instanceof expectedError)) {
                throw new Error(message || `断言失败: 抛出的错误类型不匹配，期望 ${expectedError.name}, 实际 ${e.constructor.name}`);
            }
        }
    }

    static async rejects(promiseFn, expectedError, message) {
        try {
            await promiseFn();
            throw new Error(message || `断言失败: 期望Promise拒绝，但它被解决了`);
        } catch (e) {
            if (expectedError && !(e instanceof expectedError)) {
                throw new Error(message || `断言失败: Promise拒绝的错误类型不匹配，期望 ${expectedError.name}, 实际 ${e.constructor.name}`);
            }
        }
    }
}

// 简单的测试运行器
function runTest(name, fn) {
    console.log(`运行测试: ${name}`);
    try {
        fn();
        console.log(`✅ 测试通过: ${name}`);
        return true;
    } catch (e) {
        console.error(`❌ 测试失败: ${name}`);
        console.error(e);
        return false;
    }
}

// 简单的异步测试运行器
async function runAsyncTest(name, fn) {
    console.log(`运行测试: ${name}`);
    try {
        await fn();
        console.log(`✅ 测试通过: ${name}`);
        return true;
    } catch (e) {
        console.error(`❌ 测试失败: ${name}`);
        console.error(e);
        return false;
    }
}

// 测试套件运行器
async function runTestSuite(suiteName, tests) {
    console.log(`\n测试套件: ${suiteName}`);
    console.log('----------------------------------');
    
    let passed = 0;
    let failed = 0;

    for (const [name, fn] of Object.entries(tests)) {
        try {
            if (fn.constructor.name === 'AsyncFunction') {
                await fn();
            } else {
                fn();
            }
            console.log(`✅ ${name}`);
            passed++;
        } catch (e) {
            console.error(`❌ ${name}`);
            console.error(e);
            failed++;
        }
    }

    console.log('----------------------------------');
    console.log(`${suiteName} 结果: ${passed} 通过, ${failed} 失败`);
    
    if (failed > 0) {
        process.exitCode = 1;
    }
    
    return { passed, failed };
}

module.exports = {
    Assert,
    runTest,
    runAsyncTest,
    runTestSuite
}; 