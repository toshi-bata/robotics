function robotInstance(viewer, instanceName, robotName, id) {
    this._viewer = viewer;
    this.instanceName = instanceName;
    this._robotName = robotName;
    this._instanceId = id;
    this.status = "idle";
    this.ONum = ";"
    this.alermReason = "";
    this.robotRootId;
    this._targetCnt = 0;
    this._frameCnt = 0;
    this._matrixes = [];
    this._robotParts = [];
    this._nodeMatrixes = [];
    this._count = 0;
    this._intervalId = 0;
    this._alarmId = 0;
}

robotInstance.prototype.init = function (parentNode, matData, offset, noReverse) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        _this._loadRobotData(matData, noReverse).then(function () {
            _this._findNodeIds(parentNode, offset);
            for (var i = 0; i < _this._targetCnt; i++) {
                _this._nodeMatrixes.push(_this._viewer.getModel().getNodeMatrix(_this._robotParts[i]));
            }
            _this.reset();
            resolve();
        });
    });
};

robotInstance.prototype._loadRobotData = function (matData, noReverse) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        new importCSV(matData).then(function (arr) {
            var matCount = 0;
            for (var i = 0; i < arr.length; i++) {
                var a = arr[i];
                if (a.length == 17) {
                    var mat = a.map(function (element) { return Number(element); });
                    var id = mat[0];
                    if (id > _this._targetCnt)
                        _this._targetCnt = mat[0];
                    mat.shift();
                    _this._matrixes.push(mat);
                    matCount++;
                }
            }
            _this._frameCnt = matCount / _this._targetCnt;

            if (noReverse == undefined) {
                var matCopy = _this._matrixes.concat();
                for (var i = _this._frameCnt - 1; i >= 0; i--) {
                    for (var j = 0; j < _this._targetCnt; j++) {
                        _this._matrixes.push(matCopy[i * _this._targetCnt + j]);
                    }
                }
                _this._frameCnt *= 2;
            }

            resolve();
        });
    });
};

robotInstance.prototype._findNodeIds = function (parentNode, offset) {
    var _this = this;
    var model = _this._viewer.getModel();
    var nodes = [];
    findNodeIdsFromName(parentNode, model, _this._robotName, nodes);
    if (nodes.length) {
        _this.robotRootId = nodes[0]
        if (offset != undefined) {
            var nodeMatrix = _this._viewer.getModel().getNodeMatrix(_this.robotRootId);

            var rotatMatrix = new Communicator.Matrix();
            if (offset.a != undefined) {
                rotatMatrix = new Communicator.Matrix.createFromOffAxisRotation(new Communicator.Point3(0, 0, 1), offset.a);
            }

            nodeMatrix = Communicator.Matrix.multiply(nodeMatrix, rotatMatrix)

            var transMatrix = new Communicator.Matrix()
            transMatrix.setTranslationComponent(offset.x, offset.y, offset.z);
            
            model.setNodeMatrix(_this.robotRootId, Communicator.Matrix.multiply(nodeMatrix, transMatrix));
        }

        var children = model.getNodeChildren(_this.robotRootId, true);
        _this._robotParts = model.getNodeChildren(children[0], true);
        _this._robotParts.shift();

    }
};

robotInstance.prototype.shutdown = function () {
    var _this = this;
    _this.reset();
    _this.status = "shutdown";
};

robotInstance.prototype.reset = function () {
    var _this = this;
    clearInterval(_this._intervalId);
    _this._count = 0;
    for (var i = 0; i < _this._targetCnt; i++) {
        var matrix = new Communicator.Matrix.createFromArray(_this._matrixes[i])
        _this._viewer.getModel().setNodeMatrix(_this._robotParts[i], Communicator.Matrix.multiply(matrix, _this._nodeMatrixes[i]));
    }
    _this.status = "idle";
    _this.ONum = "";
    _this.alermReason = "";
    _this._viewer.getModel().setNodesTransparency([_this.robotRootId], 0.8);
};

robotInstance.prototype.alarm = function (reason) {
    var _this = this;
    clearInterval(_this._intervalId);
    _this.status = "alarm";
    _this.alermReason = reason;
    _this._viewer.getModel().resetNodesTransparency([_this.robotRootId]);

};

robotInstance.prototype.startAnimation = function (ONum) {
    var _this = this;
    _this.status = "run";
    if (_this.ONum == "")
        _this.ONum = ONum;
    _this.alermReason = "";
    _this._viewer.getModel().resetNodesTransparency([_this.robotRootId]);
    var model = _this._viewer.getModel();

    var interval = 200;
    function invokeFrame() {
        for (var i = 0; i < _this._targetCnt; i++) {
            var matrix = new Communicator.Matrix.createFromArray(_this._matrixes[_this._count * _this._targetCnt + i])
            model.setNodeMatrix(_this._robotParts[i], Communicator.Matrix.multiply(matrix, _this._nodeMatrixes[i]));
        }
        _this._count ++;
    }

    _this._intervalId = setInterval(function () {
        invokeFrame();
        if (_this.status == "stop") {
            clearInterval(_this._intervalId);
        }

        if (_this._count >= _this._frameCnt) {
            _this.reset();
            viewer.processDone(_this._instanceId);
        }
    }, interval);
};
