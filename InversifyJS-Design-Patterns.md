# InversifyJS 相关设计模式详解

## 目录
- [依赖注入模式 (Dependency Injection)](#依赖注入模式)
- [控制反转模式 (Inversion of Control)](#控制反转模式)
- [单例模式 (Singleton Pattern)](#单例模式)
- [服务定位器模式 (Service Locator)](#服务定位器模式)
- [工厂模式 (Factory Pattern)](#工厂模式)
- [策略模式 (Strategy Pattern)](#策略模式)
- [装饰器模式 (Decorator Pattern)](#装饰器模式)
- [实际应用场景](#实际应用场景)

---

## 依赖注入模式

### 📝 概念
依赖注入（DI）是一种设计模式，用于实现控制反转。对象不再自己创建依赖项，而是通过外部容器注入。

### 🔧 传统方式 vs 依赖注入

```typescript
// ❌ 传统方式 - 紧耦合
class UserService {
  private repository: UserRepository
  private emailService: EmailService

  constructor() {
    this.repository = new UserRepository()  // 硬编码依赖
    this.emailService = new EmailService()  // 难以测试和替换
  }
}

// ✅ 依赖注入方式 - 松耦合
@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private repository: IUserRepository,
    @inject(TYPES.EmailService) private emailService: IEmailService
  ) {}
}
```

### 🎯 优势
- **松耦合**: 类不依赖具体实现，只依赖接口
- **可测试性**: 轻松注入 Mock 对象进行单元测试
- **可配置性**: 运行时动态切换实现
- **可维护性**: 修改实现不影响使用方

---

## 控制反转模式

### 📝 概念
控制反转（IoC）是一种设计原则，将对象创建和依赖管理的控制权从应用代码转移到外部容器。

### 🔄 控制权转移

```typescript
// 传统控制流程
class Application {
  start() {
    const repo = new UserRepository()
    const email = new EmailService() 
    const service = new UserService(repo, email)  // 应用控制依赖创建
    service.createUser("user@example.com", "John")
  }
}

// IoC 容器控制流程
const container = new Container()
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository)
container.bind<IEmailService>(TYPES.EmailService).to(EmailService)
container.bind<IUserService>(TYPES.UserService).to(UserService)

class Application {
  start() {
    const service = container.get<IUserService>(TYPES.UserService)  // 容器控制依赖创建
    service.createUser("user@example.com", "John")
  }
}
```

### 🎯 核心原理
- **Hollywood 原则**: "Don't call us, we'll call you"
- **依赖关系图**: 容器负责构建完整的对象依赖图
- **生命周期管理**: 容器管理对象的创建、配置和销毁

---

## 单例模式

### 📝 概念
确保一个类只有一个实例，并提供全局访问点。在 InversifyJS 中通过 `inSingletonScope()` 实现。

### 🔧 实现方式

```typescript
// InversifyJS 单例配置
container
  .bind<IUserRepository>(TYPES.UserRepository)
  .to(UserRepository)
  .inSingletonScope()  // 整个应用共享一个实例

// 等价的传统单例模式
class UserRepository {
  private static instance: UserRepository
  private users: User[] = []

  private constructor() {}

  static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository()
    }
    return UserRepository.instance
  }
}
```

### 🎯 生命周期选项

```typescript
// 1. 瞬时模式（默认）- 每次都创建新实例
container.bind<IEmailService>(TYPES.EmailService).to(EmailService)

// 2. 单例模式 - 整个容器共享一个实例
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope()

// 3. 请求范围 - 在同一请求中共享
container.bind<ILoggerService>(TYPES.LoggerService).to(LoggerService).inRequestScope()
```

## 工厂模式

### 📝 概念
InversifyJS 内部使用工厂模式来创建对象实例。

### 🔧 自定义工厂

```typescript
// 接口定义
interface IConnectionFactory {
  createConnection(type: string): IConnection
}

interface IConnection {
  connect(): void
}

// 工厂实现
@injectable()
class ConnectionFactory implements IConnectionFactory {
  createConnection(type: string): IConnection {
    switch (type) {
      case 'mysql':
        return new MySQLConnection()
      case 'postgresql':
        return new PostgreSQLConnection()
      default:
        throw new Error(`Unsupported connection type: ${type}`)
    }
  }
}

// 容器配置
container.bind<IConnectionFactory>(TYPES.ConnectionFactory).to(ConnectionFactory)

// 使用工厂
@injectable()
class DatabaseService {
  constructor(
    @inject(TYPES.ConnectionFactory) private connectionFactory: IConnectionFactory
  ) {}

  connect(dbType: string) {
    const connection = this.connectionFactory.createConnection(dbType)
    connection.connect()
  }
}
```

### 🏭 工厂函数绑定

```typescript
// 直接绑定工厂函数
container.bind<IUserService>(TYPES.UserService).toFactory<IUserService>((context) => {
  return () => {
    const repository = context.container.get<IUserRepository>(TYPES.UserRepository)
    const emailService = context.container.get<IEmailService>(TYPES.EmailService)
    return new UserService(repository, emailService)
  }
})
```

---

## 策略模式

### 📝 概念
定义一系列算法，将每个算法封装起来，使它们可以互相替换。

### 🔧 实现示例

```typescript
// 策略接口
interface INotificationStrategy {
  send(message: string, recipient: string): Promise<void>
}

// 具体策略
@injectable()
class EmailNotificationStrategy implements INotificationStrategy {
  async send(message: string, recipient: string): Promise<void> {
    console.log(`📧 Email sent to ${recipient}: ${message}`)
  }
}

@injectable()
class SMSNotificationStrategy implements INotificationStrategy {
  async send(message: string, recipient: string): Promise<void> {
    console.log(`📱 SMS sent to ${recipient}: ${message}`)
  }
}

@injectable()
class PushNotificationStrategy implements INotificationStrategy {
  async send(message: string, recipient: string): Promise<void> {
    console.log(`🔔 Push notification sent to ${recipient}: ${message}`)
  }
}

// 上下文类
@injectable()
class NotificationService {
  constructor(
    @inject(TYPES.NotificationStrategy) private strategy: INotificationStrategy
  ) {}

  async notify(message: string, recipient: string): Promise<void> {
    await this.strategy.send(message, recipient)
  }
}

// 容器配置 - 可以根据环境切换策略
container.bind<INotificationStrategy>(TYPES.NotificationStrategy).to(EmailNotificationStrategy)
// container.bind<INotificationStrategy>(TYPES.NotificationStrategy).to(SMSNotificationStrategy)
```

---

## 装饰器模式

### 📝 概念
动态地为对象添加额外的职责，InversifyJS 的 `@injectable` 和 `@inject` 就是装饰器。

### 🔧 自定义装饰器

```typescript
// 日志装饰器
function LogExecution(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
  const method = descriptor.value!

  descriptor.value = function (...args: any[]) {
    console.log(`🚀 Executing ${target.constructor.name}.${propertyName}`)
    const result = method.apply(this, args)
    console.log(`✅ Completed ${target.constructor.name}.${propertyName}`)
    return result
  }
}

// 使用装饰器
@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private repository: IUserRepository
  ) {}

  @LogExecution
  async createUser(name: string, email: string): Promise<User> {
    // 方法实现
    return this.repository.save({ id: '1', name, email })
  }
}
```

### 🎭 代理装饰器

```typescript
// 缓存代理装饰器
function Cacheable(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
  const method = descriptor.value!
  const cache = new Map()

  descriptor.value = function (...args: any[]) {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      console.log(`💾 Cache hit for ${propertyName}`)
      return cache.get(key)
    }

    const result = method.apply(this, args)
    cache.set(key, result)
    console.log(`🔄 Cache miss for ${propertyName}`)
    return result
  }
}
```

---

## 实际应用场景

### 🏢 企业级应用架构

```typescript
// 多层架构示例
interface IController {
  handle(request: Request): Promise<Response>
}

interface IBusinessLogic {
  execute(data: any): Promise<any>
}

interface IDataAccess {
  save(entity: any): Promise<void>
  find(id: string): Promise<any>
}

// 控制器层
@injectable()
class UserController implements IController {
  constructor(
    @inject(TYPES.UserBusinessLogic) private businessLogic: IBusinessLogic
  ) {}

  async handle(request: Request): Promise<Response> {
    const result = await this.businessLogic.execute(request.body)
    return { status: 200, data: result }
  }
}

// 业务逻辑层
@injectable()
class UserBusinessLogic implements IBusinessLogic {
  constructor(
    @inject(TYPES.UserDataAccess) private dataAccess: IDataAccess,
    @inject(TYPES.ValidationService) private validator: IValidationService
  ) {}

  async execute(data: any): Promise<any> {
    this.validator.validate(data)
    return await this.dataAccess.save(data)
  }
}

// 数据访问层
@injectable()
class UserDataAccess implements IDataAccess {
  constructor(
    @inject(TYPES.Database) private database: IDatabase
  ) {}

  async save(entity: any): Promise<void> {
    await this.database.insert('users', entity)
  }

  async find(id: string): Promise<any> {
    return await this.database.findById('users', id)
  }
}
```

### 🧪 测试场景

```typescript
// 生产环境配置
const productionContainer = new Container()
productionContainer.bind<IUserRepository>(TYPES.UserRepository).to(DatabaseUserRepository)
productionContainer.bind<IEmailService>(TYPES.EmailService).to(SMTPEmailService)

// 测试环境配置
const testContainer = new Container()
testContainer.bind<IUserRepository>(TYPES.UserRepository).to(MockUserRepository)
testContainer.bind<IEmailService>(TYPES.EmailService).to(MockEmailService)

// Mock 实现
@injectable()
class MockUserRepository implements IUserRepository {
  private users: User[] = []
  
  async save(user: User): Promise<void> {
    this.users.push(user)
  }
  
  async getAll(): Promise<User[]> {
    return [...this.users]
  }
}
```

### 🔧 配置管理

```typescript
// 环境配置
interface IConfigService {
  get(key: string): string
  getNumber(key: string): number
  getBoolean(key: string): boolean
}

@injectable()
class ConfigService implements IConfigService {
  constructor(
    @inject(TYPES.Environment) private env: string
  ) {}

  get(key: string): string {
    return process.env[`${this.env}_${key}`] || ''
  }

  getNumber(key: string): number {
    return parseInt(this.get(key)) || 0
  }

  getBoolean(key: string): boolean {
    return this.get(key).toLowerCase() === 'true'
  }
}

// 根据环境绑定不同配置
if (process.env.NODE_ENV === 'production') {
  container.bind<string>(TYPES.Environment).toConstantValue('PROD')
} else {
  container.bind<string>(TYPES.Environment).toConstantValue('DEV')
}
```

---

## 📚 总结

InversifyJS 通过这些设计模式的组合使用，提供了：

1. **高度解耦的架构**: 通过依赖注入和控制反转
2. **灵活的对象管理**: 通过单例和工厂模式
3. **可扩展的设计**: 通过策略和装饰器模式
4. **便于测试**: 通过服务定位器和依赖注入
5. **清晰的分层**: 通过接口抽象和依赖管理

这些模式共同构成了现代企业级应用的坚实基础，让代码更加模块化、可维护和可测试。 