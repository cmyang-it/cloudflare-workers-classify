## 📋 前言

随着 AI 应用的普及，模型部署成本成为开发者的一大痛点。Cloudflare Workers AI 提供了 **免费额度充足**、**全球边缘部署** 的无服务器 AI 推理平台，支持 Llama、Mistral、Stable Diffusion 等主流模型。并且对于个人 **Free计划** 的用户，每天有 10K 的神经元额度，个人完全够用了。
> 本文将带你从零搭建一个基于 Workers AI 的图像分类接口，包含环境配置、代码编写和最佳实践。

## 🎯 准备工作

### 1. 注册并登录 Cloudflare

- 访问 [cloudflare.com](https://www.cloudflare.com) 注册账号
- 完成邮箱验证

### 2. 创建 Worker 并绑定 AI

- 进入 **计算和AI** → **Workers & Pages** → **创建应用程序** 按钮
- 创建一个Hello World 模板即可（如果不会创建，可以访问这个链接 [通过cloudflare白嫖个人docker镜像加速服务](https://xiyangai.cn/archives/cloudflare-free-docker-registry)）
- 绑定AI
**a.** 进入新创建的 **worker** 中，选择 **绑定**
  **b.** 选择 **workers AI**，点击**添加绑定**按钮
  **c.** 输入**变量名称：AI**，这个名称可以随意，点击**添加绑定**按钮
  **d.** 绑定完成之后，如图所示
## 💻 部署

### 1. 编辑 worker.js 代码

- 点击右上角的 **编辑代码** 按钮，跳转如下页面
- 删除 worker.js 里面的所有文件
- 将项目里面的 **worker.js** 代码复制到worker里面
- 点击右上角**部署**按钮
  显示部署成功后，返回到 worker 设置界面
- 配置自定义域名
  cloudflare 给定的默认访问链接再国内访问容易被墙，需要自定义一个域名，关于添加自定义域名的方式，请访问：[如何通过CloudFlare添加自己的域名站点，创建自定义域访问Workers服务-羲阳博客](https://xiyangai.cn/archives/cloudflare-custom-domain)

### 2. 新增环境变量
- 再 **设置** 界面新增变量，**保持并部署**。
  REQUIRE_TOKEN：ture 开启token验证，false 关闭token验证
  API_TOKEN：请求令牌

## 🧪 详细教程
详细教程请访问：[Cloudflare Workers AI 部署实战：零成本搭建你的AI图像分类接口](https://xiyangai.cn/archives/cloudflare-workers-ai-classify)
