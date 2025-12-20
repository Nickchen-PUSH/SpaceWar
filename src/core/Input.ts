export class Input {
    // --- 内部状态容器 ---

    // 当前按下的所有键 (用于检测 "按住")
    private keysCurrent: Set<string> = new Set();

    // 本帧刚刚按下的键 (用于检测 "触发一次")
    private keysDown: Set<string> = new Set();

    // 本帧刚刚松开的键
    private keysUp: Set<string> = new Set();

    // 鼠标状态
    private mouseX: number = 0;
    private mouseY: number = 0;
    // 鼠标按钮: 0=左键, 1=中键, 2=右键
    private mouseButtonsCurrent: Set<number> = new Set();
    private mouseButtonsDown: Set<number> = new Set();

    // DOM 元素引用 (用于计算鼠标相对坐标)
    private target: HTMLElement | Window = window;

    /**
     * 初始化监听器
     * @param target 监听事件的目标，通常是 window 或 canvas 容器
     */
    init(target: HTMLElement | Window = window) {
        this.target = target;

        // 1. 键盘事件
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);

        // 2. 鼠标事件
        // 注意：鼠标移动最好绑定在 window 上，防止鼠标移出画布后失去响应
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mouseup", this.onMouseUp);

        // 阻止右键菜单 (可选，为了游戏体验)
        window.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    /**
     * 清理监听器 (销毁游戏时调用)
     */
    dispose() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mouseup", this.onMouseUp);
    }

    /**
     * 帧末清理 (由 Game.ts 循环调用)
     * 必须在 update 和 render 之后调用，清除“本帧瞬间状态”
     */
    clearFrame() {
        this.keysDown.clear();
        this.keysUp.clear();
        this.mouseButtonsDown.clear();
    }

    // =========================================
    //  对外接口 (API)
    // =========================================

    /**
     * 检测键是否被按住 (持续触发)
     * 用法: if (input.getKey("KeyW")) MoveForward();
     */
    getKey(code: string): boolean {
        return this.keysCurrent.has(code);
    }

    /**
     * 检测键是否刚刚被按下 (只在按下的那一帧触发一次)
     * 用法: if (input.getKeyDown("Space")) FireMissile();
     */
    getKeyDown(code: string): boolean {
        return this.keysDown.has(code);
    }

    /**
     * 检测键是否刚刚松开
     */
    getKeyUp(code: string): boolean {
        return this.keysUp.has(code);
    }

    /**
     * 检测鼠标按键是否被按住 (0:左, 1:中, 2:右)
     */
    getMouseButton(button: number): boolean {
        return this.mouseButtonsCurrent.has(button);
    }

    /**
     * 检测鼠标按键是否刚刚按下
     */
    getMouseButtonDown(button: number): boolean {
        return this.mouseButtonsDown.has(button);
    }

    /**
     * 获取鼠标位置 (相对于窗口左上角)
     * 如果你需要相对于 Canvas 的坐标，通常在 Camera 或射线检测里转换
     */
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }

    /**
     * [高级辅助] 获取轴输入 (-1 到 1)
     * 极大简化移动逻辑
     * @example input.getAxis("KeyA", "KeyD") // 按A返-1, 按D返1, 都不按返0
     */
    getAxis(negativeKey: string, positiveKey: string): number {
        let value = 0;
        if (this.getKey(positiveKey) || this.getKey("ArrowRight")) value += 1; // 兼容箭头键
        if (this.getKey(negativeKey) || this.getKey("ArrowLeft")) value -= 1;
        return value;
    }

    getAxisVertical(negativeKey: string, positiveKey: string): number {
        let value = 0;
        if (this.getKey(positiveKey) || this.getKey("ArrowUp")) value += 1;
        if (this.getKey(negativeKey) || this.getKey("ArrowDown")) value -= 1;
        return value;
    }

    // =========================================
    //  事件回调 (Event Handlers)
    // =========================================

    private onKeyDown = (event: KeyboardEvent) => {
        // 避免按住键时操作系统重复触发 keydown
        if (event.repeat) return;

        // event.code 对应物理按键 (如 "KeyW", "ArrowUp", "Space")
        // event.key 对应字符 (如 "w", "W")，受输入法影响，不推荐用于游戏控制
        this.keysCurrent.add(event.code);
        this.keysDown.add(event.code);
    };

    private onKeyUp = (event: KeyboardEvent) => {
        this.keysCurrent.delete(event.code);
        this.keysUp.add(event.code);
    };

    private onMouseMove = (event: MouseEvent) => {
        // 简单的记录 clientX/Y，这是相对于浏览器视口的
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    };

    private onMouseDown = (event: MouseEvent) => {
        this.mouseButtonsCurrent.add(event.button);
        this.mouseButtonsDown.add(event.button);
    };

    private onMouseUp = (event: MouseEvent) => {
        this.mouseButtonsCurrent.delete(event.button);
    };
}