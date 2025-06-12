### 🎯 **InversifyJS 生命周期管理**

1. **默认行为** - `Transient`（瞬时）: 每次请求都创建新实例
2. **单例模式** - `inSingletonScope()`: 整个容器中只有一个实例
3. **请求范围** - `inRequestScope()`: 在同一个请求中共享实例

现在你的用户数据应该能正确保存和显示了！这也展示了 InversifyJS 容器管理的重要特性。

https://inversify.io/docs/fundamentals/binding/ 里搜 Binding properties