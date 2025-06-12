import { useState, useEffect } from "react"
import { Container, inject, injectable } from "inversify"

// 服务标识符
const TYPES = {
  UserRepository: Symbol.for("UserRepository"),
  EmailService: Symbol.for("EmailService"),
  UserService: Symbol.for("UserService"),
}

// 基本接口
interface User {
  id: string
  name: string
  email: string
}

interface IUserRepository {
  save(user: User): Promise<void>
  getAll(): Promise<User[]>
}

interface IEmailService {
  sendEmail(email: string): Promise<void>
}

interface IUserService {
  createUser(name: string, email: string): Promise<User>
  getUsers(): Promise<User[]>
}

// 实现类
@injectable()
class UserRepository implements IUserRepository {
  private users: User[] = []

  async save(user: User): Promise<void> {
    this.users.push(user)
  }

  async getAll(): Promise<User[]> {
    return [...this.users]
  }
}

@injectable()
class EmailService implements IEmailService {
  async sendEmail(email: string): Promise<void> {
    console.log(`📧 发送邮件到: ${email}`)
  }
}

@injectable()
class UserService implements IUserService {
  constructor(
    @inject(TYPES.UserRepository) private repository: IUserRepository,
    @inject(TYPES.EmailService) private emailService: IEmailService,
  ) {}

  async createUser(name: string, email: string): Promise<User> {
    const user: User = {
      id: Math.random().toString(36).substring(2, 8),
      name,
      email,
    }

    await this.repository.save(user)
    await this.emailService.sendEmail(email)

    return user
  }

  async getUsers(): Promise<User[]> {
    return await this.repository.getAll()
  }
}

// 容器配置
const container = new Container()
container
  .bind<IUserRepository>(TYPES.UserRepository)
  .to(UserRepository)
  .inSingletonScope()
container.bind<IEmailService>(TYPES.EmailService).to(EmailService)
container.bind<IUserService>(TYPES.UserService).to(UserService)

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const userService = container.get<IUserService>(TYPES.UserService)

  const loadUsers = async () => {
    const allUsers = await userService.getUsers()
    setUsers(allUsers)
  }

  const handleCreate = async () => {
    if (!name || !email) return

    await userService.createUser(name, email)
    setName("")
    setEmail("")
    await loadUsers()
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <div style={{ padding: "20px", maxWidth: "600px" }}>
      <h1>🚀 InversifyJS 演示</h1>

      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>创建用户</h3>
        <input
          placeholder="姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "8px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <input
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "8px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          type="button"
          onClick={handleCreate}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          创建
        </button>
      </div>

      <div
        style={{
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>用户列表 ({users.length})</h3>
        {users.length === 0 ? (
          <p style={{ color: "#666" }}>暂无用户</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              style={{
                padding: "8px",
                margin: "5px 0",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <strong>{user.name}</strong> - {user.email}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f0f8ff",
          borderRadius: "8px",
        }}
      >
        <h4>🎯 InversifyJS 核心特性</h4>
        <ul style={{ margin: 0 }}>
          <li>
            <strong>依赖注入</strong>: UserService 自动获取依赖
          </li>
          <li>
            <strong>接口抽象</strong>: 通过接口定义契约
          </li>
          <li>
            <strong>容器管理</strong>: 统一管理服务实例
          </li>
        </ul>
      </div>
    </div>
  )
}

export default App
