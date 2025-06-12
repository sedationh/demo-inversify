import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { Container, inject } from "inversify"

createRoot(document.getElementById("root")!).render(<App />)

class Katana {
  public readonly damage: number = 10
}

class Ninja {
  constructor(@inject(Katana) public katana: Katana) {}
}

const container: Container = new Container()

const ninja: Ninja = container.get(Ninja, { autobind: true })
// const ninja: Ninja = container.get(Ninja)

console.log(ninja.katana.damage)
