var BasketballManager = (function () {
    function BasketballManager() {
    }
    BasketballManager.prototype.init = function () {
        this.goalCounter = document.getElementById('goalCounter');
        this.hoopBorder = document.getElementById('hoopBorder');
        var self = this;
        document.onmousemove = function (ev) {
            self.onMouseMove(ev);
            return false;
        };
        document.onmouseup = function (ev) {
            self.onMouseUp(ev);
            return false;
        };
        document.onmousedown = function (ev) {
            self.onMouseDown(ev);
            return false;
        };
        window.onresize = function () {
            self.updateElementsPositions();
        };
        // отменить перенос и выделение текста при клике на тексте
        document.ondragstart = function () {
            return false;
        };
        document.body.onselectstart = function () {
            return false;
        };
        this.clearBallData();
        this.setHoopCoordinates();
        this.resetGoalCounter();
    };
    BasketballManager.prototype.clearBallData = function () {
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
    };
    BasketballManager.prototype.resetGoalCounter = function () {
        this.goalCounter.innerText = '0';
    };
    BasketballManager.prototype.setScreenBorders = function () {
        if (this.ballData.elem) {
            this.ballData.maxX = window.innerWidth - this.ballData.elem.clientWidth;
            this.ballData.maxY = window.innerHeight - this.ballData.elem.clientHeight;
        }
    };
    BasketballManager.prototype.setHoopCoordinates = function () {
        if (this.hoopBorder) {
            var coordinates = this.getCoordinates(this.hoopBorder);
            this.hoopCoordinates = { left: coordinates.left, right: coordinates.right, top: coordinates.top };
        }
    };
    BasketballManager.prototype.updateElementsPositions = function () {
        this.setHoopCoordinates();
        this.setScreenBorders();
        this.ballData.elem.style.left = this.ballData.minX + 'px';
        this.ballData.elem.style.top = this.ballData.maxY + 'px';
    };
    BasketballManager.prototype.getCoordinates = function (elem) {
        var rotate = parseInt(elem.dataset['rotate']) || 0;
        elem.style.transform = 'rotate(' + 0 + 'deg)';
        var box = elem.getBoundingClientRect();
        elem.style.transform = 'rotate(' + rotate + 'deg)';
        return {
            top: box.top + window.pageYOffset,
            bottom: box.bottom + window.pageYOffset,
            left: box.left + window.pageXOffset,
            right: box.right + window.pageXOffset
        };
    };
    BasketballManager.prototype.checkGoalCounter = function () {
        var topTrajectoryPointA = this.ballData.physicData.trajectoryPointA.top, topTrajectoryPointB = this.ballData.physicData.trajectoryPointB.top;
        if (!this.goalCounter || !this.hoopCoordinates || (this.hoopCoordinates.left === null) || (this.hoopCoordinates.right === null) || (this.hoopCoordinates.top === null)) {
            return;
        }
        var ballCoordinates = this.getCoordinates(this.ballData.elem), isBallInHoop = (this.hoopCoordinates.top >= ballCoordinates.top) && (this.hoopCoordinates.top <= ballCoordinates.bottom) &&
            (this.hoopCoordinates.left < ballCoordinates.left) && (this.hoopCoordinates.right > ballCoordinates.right), isStartProcessBallInHoop = !this.ballData.isProcessBallInHoop && isBallInHoop, isEndProcessBallInHoop = this.ballData.isProcessBallInHoop && !isBallInHoop;
        if (isStartProcessBallInHoop) {
            this.ballData.isProcessBallInHoop = true;
            this.ballData.isBallFallDownInHoop = (topTrajectoryPointA !== null) && (topTrajectoryPointB !== null) && (topTrajectoryPointA < topTrajectoryPointB);
            if (this.ballData.isBallFallDownInHoop) {
                // засчитываем только попадания мяча при его движении в кольцо сверху вниз
                this.incrementGoalCounter();
            }
        }
        else if (isEndProcessBallInHoop) {
            this.ballData.isProcessBallInHoop = false;
        }
    };
    BasketballManager.prototype.incrementGoalCounter = function () {
        if (!this.goalCounter) {
            return;
        }
        this.goalCounter.innerText = (+this.goalCounter.innerText + 1).toString();
    };
    BasketballManager.prototype.startDrag = function () {
        this.ballData.isDragging = true;
    };
    BasketballManager.prototype.dragEnd = function () {
        this.ballData.isDragging = false;
    };
    BasketballManager.prototype.rotateElement = function (moveDistance) {
        var radius = this.ballData.elem.clientHeight / 2, circumference = 2 * Math.PI * radius, rotate = parseInt(this.ballData.elem.dataset['rotate']) || 0, newRotate = ((rotate + (360 * (moveDistance / circumference))) % 360).toString();
        this.ballData.elem.dataset['rotate'] = newRotate;
        this.ballData.elem.style.transform = 'rotate(' + newRotate + 'deg)';
    };
    BasketballManager.prototype.startPhysicProcess = function () {
        this.endPhysicProcess();
        var self = this;
        this.ballData.physicIntervalId = setInterval(function () {
            if (!self.ballData.elem) {
                self.endPhysicProcess();
                return;
            }
            var moveLeftPosition = ((self.ballData.physicData.trajectoryPointB.left - self.ballData.physicData.trajectoryPointA.left) * self.ballData.physicData.distanceReductionRatio), moveTopPosition = (self.ballData.physicData.trajectoryPointA.top - self.ballData.physicData.trajectoryPointB.top);
            var leftPosition = self.ballData.physicData.trajectoryPointB.left + moveLeftPosition, topPosition = self.ballData.physicData.trajectoryPointB.top - moveTopPosition + self.ballData.physicData.gravityRatio, reboundDistance;
            if (leftPosition > self.ballData.maxX) {
                reboundDistance = leftPosition - self.ballData.maxX;
                self.ballData.elem.style.left = self.ballData.maxX + 'px';
                leftPosition = self.ballData.maxX - reboundDistance;
            }
            else if (leftPosition < self.ballData.minX) {
                reboundDistance = leftPosition;
                self.ballData.elem.style.left = self.ballData.minX + 'px';
                leftPosition = self.ballData.minX + -reboundDistance;
            }
            else {
                self.rotateElement(topPosition > (self.ballData.maxY / 2) ? moveLeftPosition : -moveLeftPosition);
            }
            if (topPosition > self.ballData.maxY) {
                reboundDistance = (topPosition - self.ballData.maxY) * self.ballData.physicData.distanceReductionRatio;
                self.ballData.elem.style.top = self.ballData.maxY + 'px';
                if (Math.abs(reboundDistance) > 0.5) {
                    topPosition = self.ballData.maxY + -reboundDistance;
                }
                else {
                    topPosition = self.ballData.maxY;
                }
            }
            else if (topPosition < self.ballData.minY) {
                reboundDistance = topPosition;
                self.ballData.elem.style.top = self.ballData.minY + 'px';
                topPosition = self.ballData.minY + -reboundDistance;
            }
            else if ((leftPosition === self.ballData.maxX) || (leftPosition === self.ballData.minX)) {
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
    };
    BasketballManager.prototype.endPhysicProcess = function () {
        if (this.ballData.physicIntervalId) {
            clearInterval(this.ballData.physicIntervalId);
        }
    };
    BasketballManager.prototype.startListenInertiaDistance = function () {
        var self = this;
        this.ballData.distanceIntervalId = setInterval(function () {
            var coordinates = self.getCoordinates(self.ballData.elem);
            var isEmptyTrajectoryPointA = (self.ballData.physicData.trajectoryPointA.left === null) || (self.ballData.physicData.trajectoryPointA.top === null), isEmptyTrajectoryPointB = (self.ballData.physicData.trajectoryPointB.left === null) || (self.ballData.physicData.trajectoryPointB.top === null);
            if (isEmptyTrajectoryPointA) {
                self.ballData.physicData.trajectoryPointA = { left: coordinates.left, top: coordinates.top };
                isEmptyTrajectoryPointA = false;
            }
            else if (isEmptyTrajectoryPointB) {
                self.ballData.physicData.trajectoryPointB = { left: coordinates.left, top: coordinates.top };
                isEmptyTrajectoryPointB = false;
            }
            else if (!isEmptyTrajectoryPointA && !isEmptyTrajectoryPointB) {
                self.ballData.physicData.trajectoryPointA = { left: self.ballData.physicData.trajectoryPointB.left, top: self.ballData.physicData.trajectoryPointB.top };
                self.ballData.physicData.trajectoryPointB = { left: coordinates.left, top: coordinates.top };
            }
        }, 10);
    };
    BasketballManager.prototype.endListenInertiaDistance = function () {
        if (this.ballData.distanceIntervalId) {
            clearInterval(this.ballData.distanceIntervalId);
        }
    };
    BasketballManager.prototype.onMouseMove = function (ev) {
        if (!this.ballData.elem) {
            return;
        }
        var coordinates = this.getCoordinates(this.ballData.elem);
        if (!this.ballData.isDragging && !this.ballData.shiftX && !this.ballData.shiftY) {
            this.ballData.shiftX = this.ballData.downX - coordinates.left;
            this.ballData.shiftY = this.ballData.downY - coordinates.top;
            this.startDrag();
        }
        else if (this.ballData.isDragging) {
            // отобразить перенос объекта при каждом движении мыши
            var leftPosition = ev.pageX - this.ballData.shiftX, topPosition = ev.pageY - this.ballData.shiftY, rotateDistance = void 0, isTopPositionInLimit = false;
            if (topPosition < this.ballData.minY) {
                topPosition = this.ballData.minY;
            }
            else if (topPosition > this.ballData.maxY) {
                topPosition = this.ballData.maxY;
            }
            else {
                isTopPositionInLimit = true;
            }
            if (leftPosition < this.ballData.minX) {
                leftPosition = this.ballData.minX;
            }
            else if (leftPosition > this.ballData.maxX) {
                leftPosition = this.ballData.maxX;
            }
            else if ((topPosition === this.ballData.minY) || (topPosition === this.ballData.maxY)) {
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
    };
    BasketballManager.prototype.onMouseDown = function (ev) {
        if (ev.which !== 1) {
            // обрабатываем только нажатия левой кнопки мыши
            return;
        }
        var elem = ev.target.classList.contains('draggable') ? ev.target : null;
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
    };
    BasketballManager.prototype.onMouseUp = function (ev) {
        if (ev.which !== 1) {
            // обрабатываем только нажатия левой кнопки мыши
            return;
        }
        if (this.ballData.isDragging) {
            this.dragEnd();
        }
        this.startPhysicProcess();
    };
    return BasketballManager;
}());
var basketballManager = new BasketballManager();
basketballManager.init();
//# sourceMappingURL=index.js.map