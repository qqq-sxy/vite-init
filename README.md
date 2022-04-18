# 项目使用

本项目使用的技术栈有vue+koa+vite

入口文件 main.js
启动项目 node index.js
进入项目 http://localhost:3000/


# vite简介
vite是一个由原生ES Module驱动的Web开发工具，在开发环境基于浏览器原生ES imports开发，在生产环境基于Rollup打包


# vite实现原理
启动一个koa服务器拦截浏览器请求ES模块的请求。通过路径查找目录下对应文件做一定的处理最终以ES模块格式返回给客户端


# 实现基础功能
能对首页的模块化进行实现
## 创建main.js文件，moduleA.js文件

//main.js
import { str } from './moduleA.js'
console.log('vite ...' + str);
//moduleA.js
export const str = '手写vite'


## 创建一个简单的静态服务



# 第三方库支持



# Vue单页文件支持


# CSS文件支持