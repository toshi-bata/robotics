import * as Communicator from "./hoops-web-viewer.mjs";
import { createViewer } from "./create_viewer.js"
import { toolTipOperator } from "./toolTip.js"
import { robotInstance } from "./robotInstance.js"
export function robotViewer(language) {
    this._language = language;
    this._viewer;
    this._robotSystems = [];
    this.operatingRatio ={};
    this._markupHandle = "";
    this._markupId;
    this._ratios = [];
    this._resources = [];
    this._doneProcessIds = [];
}

robotViewer.prototype.start = function (viewerMode, reverseProxy) {
    var _this = this;
    _this._initResources();
    _this._initDialog();
    _this._createViewer(viewerMode, reverseProxy);
    _this._initEvent();
}

robotViewer.prototype._initResources = function () {
    var _this = this;
    if (_this._language == "ja") {
        document.title = "工場稼働モニター";
        $("#title").html("&nbsp;工場稼働モニター");
        $("#demoInfo").html('このデモは、遠隔地にある工場からアップロードされる稼働状況をモニターします：<br>' +
                            '<a href=controller.html target="_blank">https://cloud.techsoft3d.com/robotics/controller.html</a>' +
                            '&nbsp;(この工場側のアプリケーションを他のデバイスで開いてください)');
        $("#ratioBtn").html("工場稼働率");
        _this._resources = ["設備稼働率", "1日あたりの時間", "アイドリング", "稼働", "停止", "アラーム", "電源断", "設備名", "工場稼働率", "現在の状況", "加工中のプログラム"];

    } else {
        _this._resources = ["Equipment operating ratio", "Hours per Day", "Idling", "Running", "Stopping", "Alarm", "Shut-down", "Equipment name", "Factory Operating Ratio", "Current status", "Processing program"];
    }
};

robotViewer.prototype._initDialog = function () {
    var _this = this;
    $("#dialog").dialog({
        annotation: undefined,
        viewer: undefined,
        autoOpen: false,
        width: 600,
        height: 400,
        modal: true,
        title: _this._resources[8],
        closeOnEscape: true,
        resizable: false,
        open: function (event, ui) {
            var w = 600;
            if (window.innerWidth < 600)
                w = window.innerWidth;
            $("#dialog").dialog({width: w});
            drawColumnChart(_this._ratios, w);
        }

    });

    function drawColumnChart(ratios, w) {
        var dataArr = [];
        dataArr.push([_this._resources[7], _this._resources[2], {role: 'style'}, _this._resources[3], {role: 'style'}, _this._resources[4], {role: 'style'}, _this._resources[5], {role: 'style'}, _this._resources[6], {role: 'style'}]);
        for (var i = 0; i < ratios.length; i++) {
            var ratio = ratios[i];
            dataArr.push([ratio.name,
                 Number(ratio.ratio.idling), "#8080ff",
                 Number(ratio.ratio.running), "80ff80",
                 Number(ratio.ratio.stopping), "ffff80",
                 Number(ratio.ratio.alarm), "ff8080",
                 Number(ratio.ratio.shutdown), "808080"]);
        }
        var data = google.visualization.arrayToDataTable(dataArr);
        var options = {
            width: w - 50,
            height: 330,
            isStacked: true,
            series: {
                0:{color: "#8080ff",        visibleInLegend: true},
                1:{color: "80ff80",     visibleInLegend: true},
                2:{color: "ffff80",       visibleInLegend: true},
                3:{color: "ff8080", visibleInLegend: true},
                4:{color: "808080",  visibleInLegend: true},
              },
            chartArea: {left:105, top:50, width:'90%', height:'80%'},
            legend: {position: 'top', maxLines: 3},
            vAxis: {
                minValue: 0
            }

        };
        var chart = new google.visualization.BarChart(document.getElementById("columnChart"));
        chart.draw(data, options);
    }
};

robotViewer.prototype._createViewer = function (viewerMode, reverseProxy) {
    var _this = this;
    createViewer(viewerMode, "factory", "container", reverseProxy).then(function (hwv) {
        _this._viewer = hwv;

        function sceneReadyFunc() {
            // Set background color
            _this._viewer.view.setBackgroundColor(new Communicator.Color(255, 255, 255), new Communicator.Color(192, 192, 192));

            // Set selection disable
            _this._viewer.selectionManager.setHighlightFaceElementSelection(false);
            _this._viewer.selectionManager.setHighlightLineElementSelection(false);

            _this._viewer.selectionManager.setNodeSelectionColor(new Communicator.Color(128, 255, 255));

            // View
            var cameraString = '{"position":{"x":-3386.1913614589566,"y":-7528.616125337548,"z":3223.6934015976053},"target":{"x":2261.5403275520466,"y":-5107.403485060816,"z":-11.350776980114858},"up":{"x":0.4481266824899772,"y":0.13537849966297724,"z":0.8836600807264796},"width":6944.397191551557,"height":6944.397191551557,"projection":0,"nearLimit":0.01,"className":"Communicator.Camera"}'
            var json = JSON.parse(cameraString);
            var camera = Communicator.Camera.fromJson(json);
            _this._viewer.view.setCamera(camera);

            _this._viewer.view.setDrawMode(Communicator.DrawMode.Shaded);
        }

        function modelStructureReadyFunc() {
            _this._viewer.pauseRendering();
            var model = _this._viewer.model;
            _this._createRobotSystem("Arc Welding #1", "WeldRobot1", "csv/WeldRobotMatrixData.csv", {x: 1500, y: -1500, z: 0}).then(function () {
                return _this._createRobotSystem("Arc Welding #2", "WeldRobot1", "csv/WeldRobotMatrixData.csv", {a:180, x: 1500, y: -4500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Spot Welding #1", "NsRobot5", "csv/SpotWeldRobotMatrixData.csv", {x: 3000, y: -1500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Spot Welding #2", "NsRobot5", "csv/SpotWeldRobotMatrixData.csv", {a: 180, x: 3000, y: -4500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Spot Welding #3", "NsRobot5", "csv/SpotWeldRobotMatrixData.csv", {x: 4500, y: -1500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Spot Welding #4", "NsRobot5", "csv/SpotWeldRobotMatrixData.csv", {a: 180, x: 4500, y: -4500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Pick-and-place #1", "PickUpRobot1", "csv/PickUpRobotMatrixData.csv", {a: 90, x: 3200, y: -6500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("Pick-and-place #2", "PickUpRobot1", "csv/PickUpRobotMatrixData.csv", {a: -90, x: 4800, y: -7500, z: 0});
            }).then(function () {
                return _this._createRobotSystem("CMM #1", "CMM_Assy", "csv/CMMatrixData.csv", {a: -90, x: 1200, y: -5700, z: 0}, true);
            }).then(function () {
                return _this._createRobotSystem("CMM #2", "CMM_Assy", "csv/CMMatrixData2.csv", {a: -90, x: 1200, y: -7200, z: 0}, true);
            }).then(function () {
                _this._viewer.resumeRendering();

                // Chart
                function drawChart(ratio, divId) {
                    var data = google.visualization.arrayToDataTable([
                        [_this._resources[0], _this._resources[1]],
                        [_this._resources[2], Number(ratio.idling)],
                        [_this._resources[3], Number(ratio.running)],
                        [_this._resources[4], Number(ratio.stopping)],
                        [_this._resources[5], Number(ratio.alarm)],
                        [_this._resources[6], Number(ratio.shutdown)]
                    ]);

                    var options = {
                        title: _this._resources[0],
                        chartArea: {left:10, top:15, width:'100%', height:'100%'},
                        is3D: true,
                        backgroundColor: "#ffffc6",
                        colors:["#8080ff", "80ff80", "ffff80", "ff8080", "808080"],
                        pieSliceTextStyle: {color: "000000"}
                    };

                    var chart = new google.visualization.PieChart(document.getElementById(divId));
                    chart.draw(data, options);
                }

                $.getJSON("jsons/operating_ratio.json", function (ratioData) {
                    if (ratioData) {
                        _this._ratios = [];
                        for (var i = 0; i < _this._robotSystems.length; i++) {
                            var obj = ratioData[_this._robotSystems[i].instanceName];
                            if (obj != undefined) {
                                var ratio = obj[0].operating_ratio;
                                drawChart(ratio, "piechart" + i)
                                $("#piechart" + i).hide();
                                var o = {name: _this._robotSystems[i].instanceName, ratio: ratio}
                                _this._ratios.push(o);
                            }
                        }
                    }
                });

                _this._robotSystems[0].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[1].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[2].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[3].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[4].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[5].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[6].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[7].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[8].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                _this._robotSystems[9].startAnimation(('0000' + Math.floor(Math.random() * 10000)).slice(-4));
                var statusString = '{"1":{"status":"stop"},"5":{"status":"shutdown"},"7":{"status":"alarm","reason":"Program error"}}';
                $.ajax({
                    url: "../common/php/exportJson.php",
                    type: "post",
                    dataType: 'json',
                    data: {
                        data: statusString,
                        filePath: "../../robotics/jsons/status.json"
                    }
                }).done(function (data, status, xhr) {
                  $.PeriodicalUpdater({
                      url: '../common/php/getFileDate.php',
                      minTimeout: 200,
                      multiplier: 1,
                      sendData: 'filePath=../../robotics/jsons/status.json',
                  },
                  function(date){
                      if (date != "not found") {
                          $.getJSON("jsons/status.json?date=" + date, function (data) {
                              model.resetNodesColor();
                              for (var i = 0; i < _this._robotSystems.length; i++) {
                                  if (data[String(i)]) {
                                      var obj = data[String(i)];
                                      var currentStatus = _this._robotSystems[i].status;
                                      if(obj.status == "run" && currentStatus != "run") {
                                          _this._robotSystems[i].startAnimation(obj.ONum);
                                      } else if (obj.status == "stop" &&  currentStatus == "run") {
                                          _this._robotSystems[i].status = "stop"
                                      } else if (obj.status == "alarm") {
                                          _this._robotSystems[i].alarm(obj.reason);
                                      } else if (obj.status == "reset") {
                                          _this._robotSystems[i].reset();
                                      } else if (obj.status == "shutdown") {
                                          _this._robotSystems[i].shutdown();
                                      }
                                  }
                                  switch (_this._robotSystems[i].status) {
                                      case "stop":
                                          model.setNodesFaceColor([_this._robotSystems[i].robotRootId], new Communicator.Color(255, 255, 0));
                                          break;
                                      case "alarm":
                                          model.setNodesFaceColor([_this._robotSystems[i].robotRootId], new Communicator.Color(255, 0, 0));
                                          break;
                                      case "shutdown":
                                          model.setNodesFaceColor([_this._robotSystems[i].robotRootId], new Communicator.Color(128, 128, 128));
                                          break;
                                  }
                              }
                          });
                      }
                  });
                }).fail(function (xhr, status, error) {

                });

                _this._restartProcess();

            });
        }

        function selectionFunc(event) {
            if (_this._markupHandle != "") {
                _this._viewer.markupManager.unregisterMarkup(_this._markupHandle);
                $("#piechart" + _this._markupId).hide();
                _this._markupHandle = ""
            }

            _this._viewer.operatorManager.push(toolTipHandle);

            if (event.getType() != Communicator.SelectionType.None) {
                var selectionItem = event.getSelection();
                var nodeId = selectionItem.getNodeId();
                for (var i = 0; i < 3; i++)
                    nodeId = _this._viewer.model.getNodeParent(nodeId);
                var selTip = new toolTipOperator(_this._viewer, _this._robotSystems, _this._resources);
                var info = selTip._getRobotInfo(nodeId);
                if (info != undefined) {
                    var position = selectionItem.getPosition();
                    if (position) {
                        if (toolTipOp != undefined) {
                            var obj = toolTipOp.getMarkupHandle();
                            _this._markupHandle = obj.handle;
                            _this._markupId = obj.id;
                            _this._viewer.operatorManager.pop();
                        }
                        if (_this._markupHandle == "") {
                            var markupItem = new textBoxMarkup(_this._viewer, _this._resources, position, info);
                            _this._markupHandle = _this._viewer.markupManager.registerMarkup(markupItem);
                            _this._markupId = info.id;
                        }
                    }
                    _this._viewer.model.setNodesHighlighted([nodeId], true);
                }
            }
        }

        _this._viewer.setCallbacks({
            sceneReady: sceneReadyFunc,
            modelStructureReady: modelStructureReadyFunc,
            selection: selectionFunc
        });

        // register custom operator
        var toolTipOp = new toolTipOperator(_this._viewer, _this._robotSystems, _this._resources);
        var toolTipHandle = _this._viewer.registerCustomOperator(toolTipOp);

        _this._viewer.start();
        _this._viewer.operatorManager.push(toolTipHandle);
    });
};

robotViewer.prototype._initEvent = function () {
    var _this = this;

    var resizeTimer;
    var interval = Math.floor(1000 / 60 * 10);
    $(window).resize(function() {
      if (resizeTimer !== false) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(function () {
        layoutPage()
        _this._viewer.resizeCanvas();
      }, interval);
    });

    layoutPage();

    function layoutPage () {
        $("#content")
            .offset({top: 82})
            .height(window.innerHeight -83);
        $("#footer").offset({
            top: window.innerHeight - 20
        });
    }

    $("#ratioBtn").click(function (e) {
        $("#dialog").dialog("open");
    })
};

robotViewer.prototype._createRobotSystem = function (instanceName, robotName, matData, offset, noReverse) {
    var _this = this;
    return new Promise(function (resolve, reject) {
        var model = _this._viewer.model;
        var root = model.getAbsoluteRootNode();
        var nodeName = "robot_system_" + _this._robotSystems.length;
        var nodeId = model.createNode(root, nodeName);
        model.loadSubtreeFromModel(nodeId, robotName).then(function () {
            var robotSystem = new robotInstance(_this._viewer, instanceName, robotName, _this._robotSystems.length);
            robotSystem.init(nodeId, matData, offset, noReverse).then(function () {
                _this._robotSystems.push(robotSystem);
                resolve();
            });
        });
    });
};

robotViewer.prototype._loadOperatingRatio = function () {
    var _this = this;
    return new Promise(function (resolve, reject) {

    });
};

robotViewer.prototype._restartProcess = function () {
  var _this = this;

  var intId = setInterval(function() {
    if (0 < _this._doneProcessIds.length) {
      var arr = _this._doneProcessIds.concat();
      _this._doneProcessIds.length = 0;

      var statusString = '{';
      for (var i = 0; i < arr.length; i++) {
        statusString += '"' + arr[i] + '":{"status":"run","ONum":"' + ('0000' + Math.floor(Math.random() * 10000)).slice(-4) + '"}';
        if (i < arr.length - 1) {
          statusString += ',';
        }
      }
      statusString += '}';

      $.ajax({
        url: "../common/php/exportJson.php",
        type: "post",
        dataType: 'json',
        data: {
          data: statusString,
          filePath: "../../robotics/jsons/status.json"
        }
      });
    }
  }, 2000);
};

robotViewer.prototype.processDone = function (id) {
  var _this = this;
  // console.log(id);
  _this._doneProcessIds.push(id);
};
