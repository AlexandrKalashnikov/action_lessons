interface PointCoordinates {
    top: number;
    left: number;
}

interface BoundingRect extends PointCoordinates {
    right: number;
    bottom?: number;
}

interface PhysicData {
    gravityRatio: number;
    distanceReductionRatio: number;
    trajectoryPointA: PointCoordinates;
    trajectoryPointB: PointCoordinates;
}

interface BallData {
    elem: HTMLElement;
    downX: number;  // координата X, на которвй произошел mousedown
    downY: number;  // координата Y, на которвй произошел mousedown
    shiftX: number, // относительный сдвиг курсора по X от верхнего левого угла элемента при перетаскивании
    shiftY: number, // относительный сдвиг курсора по Y от верхнего левого угла элемента при перетаскивании
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    isDragging: boolean,
    isProcessBallInHoop: boolean,
    isBallFallDownInHoop: boolean, // флаг того, что мяч попал в кольцо сверху
    physicIntervalId: number,
    distanceIntervalId: number,
    physicData: PhysicData
}

class BasketballManager {
    protected ballData: BallData;
    protected goalCounter: HTMLElement;
    protected hoopBorder: HTMLElement;
    protected hoopCoordinates: BoundingRect;

    public constructor() {}

    public init(): void {
        this.goalCounter = document.getElementById('goalCounter');
        this.hoopBorder = document.getElementById('hoopBorder');

        const self: BasketballManager = this;

        document.onmousemove = function(ev): boolean {
            self.onMouseMove(ev);
            return false;
        };

        document.onmouseup = function(ev): boolean {
            self.onMouseUp(ev);
            return false;
        };

        document.onmousedown = function(ev): boolean {
            self.onMouseDown(ev);
            return false;
        };

        window.onresize = function(): void {
            self.updateElementsPositions();
        };

        // отменить перенос и выделение текста при клике на тексте
        document.ondragstart = function(): boolean {
            return false;
        };

        document.body.onselectstart = function(): boolean {
            return false;
        };

        this.clearBallData();
        this.setHoopCoordinates();
        this.resetGoalCounter();
    }

    protected clearBallData(): void {
        this.ballData = {
            elem: null,
            downX: null,
            downY: null,
            shiftX: null,
            shiftY: null,
            minX: 0,
            maxX: null,
            minY: 0,
            maxY: null,
            isDragging: false,
            isProcessBallInHoop: false,
            isBallFallDownInHoop: false,
            physicIntervalId: null,
            distanceIntervalId: null,
            physicData: {
                gravityRatio: 0.3,
                distanceReductionRatio: 0.97,
                trajectoryPointA: { left: null, top: null },
                trajectoryPointB: { left: null, top: null }
            }
        };
    }

    protected resetGoalCounter(): void {
        this.goalCounter.innerText = '0';
    }

    protected setScreenBorders(): void {
        if (this.ballData.elem) {
            this.ballData.maxX = window.innerWidth - this.ballData.elem.clientWidth;
            this.ballData.maxY = window.innerHeight - this.ballData.elem.clientHeight;
        }
    }

    protected setHoopCoordinates(): void {
        if (this.hoopBorder) {
            const coordinates = this.getCoordinates(this.hoopBorder);

            this.hoopCoordinates = { left: coordinates.left, right: coordinates.right, top: coordinates.top };
        }
    }

    protected updateElementsPositions(): void {
        this.setHoopCoordinates();
        this.setScreenBorders();

        this.ballData.elem.style.left = this.ballData.minX + 'px';
        this.ballData.elem.style.top = this.ballData.maxY + 'px';
    }

    protected getCoordinates(elem: HTMLElement): BoundingRect {
        const rotate: number = parseInt(elem.dataset['rotate']) || 0;

        elem.style.transform = 'rotate(' + 0 + 'deg)';

        const box: ClientRect = elem.getBoundingClientRect();

        elem.style.transform = 'rotate(' + rotate + 'deg)';

        return {
            top: box.top + window.pageYOffset,
            bottom: box.bottom + window.pageYOffset,
            left: box.left + window.pageXOffset,
            right: box.right + window.pageXOffset
        };
    }

    protected checkGoalCounter(): void {
        const topTrajectoryPointA: number = this.ballData.physicData.trajectoryPointA.top,
              topTrajectoryPointB: number = this.ballData.physicData.trajectoryPointB.top;

        if (!this.goalCounter || !this.hoopCoordinates || (this.hoopCoordinates.left === null) || (this.hoopCoordinates.right === null) || (this.hoopCoordinates.top === null)) {
            return;
        }

        const ballCoordinates: BoundingRect = this.getCoordinates(this.ballData.elem),

              isBallInHoop: boolean = (this.hoopCoordinates.top >= ballCoordinates.top) && (this.hoopCoordinates.top <= ballCoordinates.bottom) &&
                (this.hoopCoordinates.left < ballCoordinates.left) && (this.hoopCoordinates.right > ballCoordinates.right),

              isStartProcessBallInHoop: boolean = !this.ballData.isProcessBallInHoop && isBallInHoop,
              isEndProcessBallInHoop: boolean = this.ballData.isProcessBallInHoop && !isBallInHoop;

        if (isStartProcessBallInHoop) {
            this.ballData.isProcessBallInHoop = true;
            this.ballData.isBallFallDownInHoop = (topTrajectoryPointA !== null) && (topTrajectoryPointB !== null) && (topTrajectoryPointA < topTrajectoryPointB);

            if (this.ballData.isBallFallDownInHoop) {
                // засчитываем только попадания мяча при его движении в кольцо сверху вниз
                this.incrementGoalCounter();
            }
        } else if (isEndProcessBallInHoop)  {
            this.ballData.isProcessBallInHoop = false;
        }
    }

    protected incrementGoalCounter(): void {
        if (!this.goalCounter) {
            return;
        }

        this.goalCounter.innerText = (+this.goalCounter.innerText + 1).toString();
    }

    protected startDrag(): void {
        this.ballData.isDragging = true;
    }

    protected dragEnd(): void {
        this.ballData.isDragging = false;
    }

    protected rotateElement(moveDistance): void {
        const radius: number = this.ballData.elem.clientHeight / 2,
              circumference: number = 2 * Math.PI * radius,
              rotate: number = parseInt(this.ballData.elem.dataset['rotate']) || 0,
              newRotate: string = ((rotate + (360 * (moveDistance / circumference))) % 360).toString();

        this.ballData.elem.dataset['rotate'] = newRotate;
        this.ballData.elem.style.transform = 'rotate(' + newRotate + 'deg)';
    }

    protected startPhysicProcess(): void {
        this.endPhysicProcess();

        const self: BasketballManager = this;

        this.ballData.physicIntervalId = setInterval(function() {
            if (!self.ballData.elem) {
                self.endPhysicProcess();
                return;
            }

            const moveLeftPosition: number = ((self.ballData.physicData.trajectoryPointB.left - self.ballData.physicData.trajectoryPointA.left) * self.ballData.physicData.distanceReductionRatio),
                  moveTopPosition: number = (self.ballData.physicData.trajectoryPointA.top - self.ballData.physicData.trajectoryPointB.top);

            let leftPosition: number = self.ballData.physicData.trajectoryPointB.left + moveLeftPosition,
                topPosition: number = self.ballData.physicData.trajectoryPointB.top - moveTopPosition + self.ballData.physicData.gravityRatio,
                reboundDistance: number;

            if (leftPosition > self.ballData.maxX) {
                reboundDistance = leftPosition - self.ballData.maxX;
                self.ballData.elem.style.left = self.ballData.maxX + 'px';
                leftPosition = self.ballData.maxX - reboundDistance;
            } else if (leftPosition < self.ballData.minX) {
                reboundDistance = leftPosition;
                self.ballData.elem.style.left = self.ballData.minX + 'px';
                leftPosition = self.ballData.minX + -reboundDistance;
            } else {
                self.rotateElement(topPosition > (self.ballData.maxY / 2) ? moveLeftPosition : -moveLeftPosition);
            }

            if (topPosition > self.ballData.maxY) {
                reboundDistance = (topPosition - self.ballData.maxY) * self.ballData.physicData.distanceReductionRatio;
                self.ballData.elem.style.top = self.ballData.maxY + 'px';

                if (Math.abs(reboundDistance) > 0.5) {
                    topPosition = self.ballData.maxY + -reboundDistance;
                } else {
                    topPosition = self.ballData.maxY;
                }
            } else if (topPosition < self.ballData.minY) {
                reboundDistance = topPosition;
                self.ballData.elem.style.top = self.ballData.minY + 'px';
                topPosition = self.ballData.minY + -reboundDistance;
            } else if ((leftPosition === self.ballData.maxX) || (leftPosition === self.ballData.minX)) {
                self.rotateElement(leftPosition > (self.ballData.maxX / 2) ? moveTopPosition : -moveTopPosition);
            }

            self.ballData.elem.style.left = leftPosition + 'px';
            self.ballData.elem.style.top = topPosition + 'px';

            self.checkGoalCounter();

            if ((topPosition === self.ballData.maxY) && (Math.abs(moveLeftPosition) < 1)) {
                self.endPhysicProcess();
                self.endListenInertiaDistance();
            }
        }, 10);
    }

    protected endPhysicProcess(): void {
        if (this.ballData.physicIntervalId) {
            clearInterval(this.ballData.physicIntervalId);
        }
    }

    protected startListenInertiaDistance(): void {
        const self: BasketballManager = this;

        this.ballData.distanceIntervalId = setInterval(function() {
            const coordinates = self.getCoordinates(self.ballData.elem);

            let isEmptyTrajectoryPointA = (self.ballData.physicData.trajectoryPointA.left === null) || (self.ballData.physicData.trajectoryPointA.top === null),
                isEmptyTrajectoryPointB = (self.ballData.physicData.trajectoryPointB.left === null) || (self.ballData.physicData.trajectoryPointB.top === null);

            if (isEmptyTrajectoryPointA) {
                self.ballData.physicData.trajectoryPointA = {left: coordinates.left, top: coordinates.top};
                isEmptyTrajectoryPointA = false;
            } else if (isEmptyTrajectoryPointB) {
                self.ballData.physicData.trajectoryPointB = {left: coordinates.left, top: coordinates.top};
                isEmptyTrajectoryPointB = false;
            } else if (!isEmptyTrajectoryPointA && !isEmptyTrajectoryPointB) {
                self.ballData.physicData.trajectoryPointA = {left: self.ballData.physicData.trajectoryPointB.left, top: self.ballData.physicData.trajectoryPointB.top};
                self.ballData.physicData.trajectoryPointB = {left: coordinates.left, top: coordinates.top};
            }
        }, 10);
    }

    protected endListenInertiaDistance(): void {
        if (this.ballData.distanceIntervalId) {
            clearInterval(this.ballData.distanceIntervalId);
        }
    }

    protected onMouseMove(ev: MouseEvent): void {
        if (!this.ballData.elem) {
            return;
        }

        const coordinates: BoundingRect = this.getCoordinates(this.ballData.elem);

        if (!this.ballData.isDragging && !this.ballData.shiftX && !this.ballData.shiftY) {
            this.ballData.shiftX = this.ballData.downX - coordinates.left;
            this.ballData.shiftY = this.ballData.downY - coordinates.top;

            this.startDrag();
        } else if (this.ballData.isDragging) {
            // отобразить перенос объекта при каждом движении мыши
            let leftPosition = ev.pageX - this.ballData.shiftX,
                topPosition = ev.pageY - this.ballData.shiftY,
                rotateDistance,
                isTopPositionInLimit = false;

            if (topPosition < this.ballData.minY) {
                topPosition = this.ballData.minY;
            } else if (topPosition > this.ballData.maxY) {
                topPosition = this.ballData.maxY;
            } else {
                isTopPositionInLimit = true;
            }

            if (leftPosition < this.ballData.minX) {
                leftPosition = this.ballData.minX;
            } else if (leftPosition > this.ballData.maxX) {
                leftPosition = this.ballData.maxX;
            } else if ((topPosition === this.ballData.minY) || (topPosition === this.ballData.maxY)) {
                rotateDistance = (leftPosition - coordinates.left);
                this.rotateElement(topPosition > (this.ballData.maxY / 2) ? rotateDistance : -rotateDistance);
            }

            // При ручном перетаскивании мяча его нужно вращать только при косании краев экрана (в данном случае правой и левой)
            if (isTopPositionInLimit && ((leftPosition === this.ballData.minX) || (leftPosition === this.ballData.maxX))) {
                rotateDistance = (topPosition - coordinates.top);
                this.rotateElement(leftPosition > (this.ballData.maxX / 2) ? -rotateDistance : rotateDistance);
            }

            this.ballData.elem.style.left = leftPosition + 'px';
            this.ballData.elem.style.top = topPosition + 'px';
        }
    }

    protected onMouseDown(ev: MouseEvent): void {
        if (ev.which !== 1) {
            // обрабатываем только нажатия левой кнопки мыши
            return;
        }

        const elem: HTMLElement = (<HTMLElement>ev.target).classList.contains('draggable') ? <HTMLElement>ev.target : null;

        if (!elem) {
            return;
        }

        this.endPhysicProcess();
        this.endListenInertiaDistance();
        this.clearBallData();

        this.ballData.elem = elem;

        this.setScreenBorders();

        // запомним координаты, на которых находился элемент в начале перетаскивания
        this.ballData.downX = ev.pageX;
        this.ballData.downY = ev.pageY;

        this.startListenInertiaDistance();
    }

    protected onMouseUp(ev: MouseEvent): void {
        if (ev.which !== 1) {
            // обрабатываем только нажатия левой кнопки мыши
            return;
        }

        if (this.ballData.isDragging) {
            this.dragEnd();
        }

        this.startPhysicProcess();
    }
}

const basketballManager = new BasketballManager();
basketballManager.init();