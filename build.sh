#!/bin/bash

# Zot-NASA-ADS打包脚本
# 使用方法: 
# 1. 打包插件: ./build.sh
# 2. 运行测试: ./build.sh test

# 检查命令行参数
if [ "$1" == "test" ]; then
    echo "运行单元测试..."
    node test/run-tests.js
    exit $?
fi

# 获取版本号
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
echo "打包Zot-NASA-ADS插件 v$VERSION"

# 创建临时目录
TEMP_DIR="zot-nasa-ads-$VERSION"
mkdir -p "$TEMP_DIR"

# 复制所有需要的文件
echo "正在复制文件..."
cp bootstrap.js "$TEMP_DIR/"
cp manifest.json "$TEMP_DIR/"
cp zot-nasa-ads.js "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/" 2>/dev/null || echo "警告: 未找到LICENSE文件"
cp -r chrome "$TEMP_DIR/" 2>/dev/null || echo "警告: 未找到chrome目录"
cp -r locale "$TEMP_DIR/" 2>/dev/null || echo "警告: 未找到locale目录"

# 创建XPI文件
echo "正在创建XPI文件..."
cd "$TEMP_DIR"
zip -r "../zot-nasa-ads-$VERSION.xpi" *
cd ..

# 清理
echo "正在清理..."
rm -rf "$TEMP_DIR"

echo "完成! 创建的文件: zot-nasa-ads-$VERSION.xpi"
echo "您可以在Zotero中通过'工具 > 插件 > 从文件安装附加组件...'安装此文件" 