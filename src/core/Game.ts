export class Game {
    private lastTime = 0
    start() {
        requestAnimationFrame(this.loop)
    }

    private loop = (time: number) => {
        const delta = (time - this.lastTime) / 1000
        this.lastTime = time

        this.update(delta)
        this.render()
        console.log(`Delta time: ${delta}ms`)

        requestAnimationFrame(this.loop)
    }

    update(delta: number) {}
    render() {}
}