vite是一个由原生ES Module驱动的Web开发工具，在开发环境基于浏览器原生ES imports开发，在生产环境基于Rollup打包

本项目使用的技术栈有vue+koa+vite

入口文件 index.js
启动项目 node index.js
进入项目 http://localhost:3000/


Vite的基本实现原理，就是启动一个koa服务器拦截浏览器请求ES模块的请求。通过路径查找目录下对应文件做一定的处理最终以ES模块格式返回给客户端