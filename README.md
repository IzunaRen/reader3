# 阅读3.0 服务器版 VS Code 插件

一个用于管理[阅读3.0服务器版](https://github.com/hectorqin/reader)的 VS Code 扩展插件，服务器端口为2121。

## 功能特性

- 📚 **打开书架** - 在 VS Code 编辑器中直接打开阅读3.0书架
- ▶️ **启动后端** - 一键启动阅读3.0后端服务
- ⏹️ **关闭后端** - 一键停止后端服务
- ⚙️ **配置管理** - 设置后端文件路径

## 快速开始

### 1. 安装插件

在 VS Code 中搜索 "阅读3.0服务器版" 并安装，或通过 `.vsix` 文件安装。

### 2. 配置后端路径

1. 点击左侧活动栏的「阅读3.0」图标
2. 点击「设置后端地址」
3. 输入后端文件所在路径（例如：`/Users/izuna/Documents/reader`）

### 3. 启动服务

1. 点击「启动后端」按钮
2. 等待后端启动完成后，点击「打开书架」
3. 书架将在 VS Code 编辑器中打开

## 依赖

本插件依赖阅读3.0服务器版后端服务。

> 📖 阅读3.0服务器版 GitHub：https://github.com/hectorqin/reader

## 插件命令

| 命令                                 | 说明         |
| ------------------------------------ | ------------ |
| `izuna-book-reader.openBookshelf`  | 打开书架     |
| `izuna-book-reader.startBackend`   | 启动后端     |
| `izuna-book-reader.stopBackend`    | 关闭后端     |
| `izuna-book-reader.setBackendPath` | 设置后端地址 |

## 扩展设置

- `izuna-book-reader.backendPath` - 后端文件所在路径

## 问题反馈

如果遇到问题，请提交 Issue 到 GitHub 仓库。

---

**Enjoy! 🎉**
