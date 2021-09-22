const CANVAS_TAGNAME = "CANVAS";
const DEFAULT_CANVAS_ID = "table-canvas-id";
const borderStyle = "2px solid ";
const gapValue = 2;
class Table {
  constructor(params = {}) {
    this.el = null;
    this.canvas = null;
    this.ctx = null;
    this.width = 500;
    this.height = 500;
    this.scale = 1;
    this.lineStyle = {
      color: "#ddd",
      style: "solid",
      width: 2,
    };
    this.header_height = 50; // table header 高度
    this.side_width = 100; // 左侧 sider 宽度
    this.columns = [{ title: "姓名" }, { title: "性别" }, { title: "年龄" }];
    this.sides = [
      { title: "A 公司" },
      { title: "B 公司" },
      { title: "C 公司" },
    ];
    this.colSize = []; // 各个列的宽度
    this.rowSize = []; // 各个行的高度
    this.rowResizeSelector = []; // 缩放单元格时 行选择 dom
    this.colResizeSelector = []; // 缩放单元格时 列选择 dom
    this.isMouseDown = false; // 当前 canvas 是 mousedown 状态

    this.tableData = [
      [
        {
          text: "cell-1", // 打不死打火机把涉及到把家还舍不得家还是不对加班时间段八十多
          row: 1,
          col: 2,
        },
        { text: "cell-2", row: 1, col: 1 },
        { text: "cell-3", row: 1, col: 1 },
      ],
      [
        { text: "cell-4", row: 1, col: 1 },
        { text: "cell-5", row: 1, col: 1 },
        { text: "cell-6", row: 2, col: 1 },
      ],
      [
        { text: "cell-7", row: 1, col: 1 },
        { text: "cell-8", row: 1, col: 1 },
        { text: "cell-9", row: 1, col: 1 },
      ],
    ];
    this.fontSize = {
      header: 18,
      data: 12,
      size: 14,
    };

    this.renderedCells = {}; // 已经绘制过的 cell
    this.tablePosition = {};

    Object.assign(this, params);

    // 初始化画布参数
    this.init();
    this.calcCellSize();

    if (this.ctx) {
      this.draw_container();
      this.draw_header();
      this.draw_side();
      this.draw_data();
      this.getResizeSelector();

      this._addEventListener();
    }
  }

  getResizeSelector() {
    this.rowResizeSelector = document.querySelectorAll(".resize.row");
    this.colResizeSelector = document.querySelectorAll(".resize.col");
  }

  // 添加处理事件
  _addEventListener() {
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.tablePosition["offsetLeft"]) {
        const { offsetLeft, offsetTop } = this.tablePosition;
        const canvasX = e.clientX - offsetLeft;
        const canvasY = e.clientY - offsetTop;

        if (this.colResizeSelector[0].offsetLeft !== -100) {
          this.colResizeSelector[0].style.left = "-100px";
          this.colResizeSelector[1].style.left = "-100px";
        }
        if (this.rowResizeSelector[0].offsetTop !== -100) {
          this.rowResizeSelector[0].style.top = "-100px";
          this.rowResizeSelector[1].style.top = "-100px";
        }
        if (canvasX > this.side_width && canvasY < this.header_height) {
          this.checkResize_col(canvasX);
        }
        if (canvasX < this.side_width && canvasY > this.header_height) {
          this.checkResize_row(canvasY);
        }
      }
    });
    this.canvas.addEventListener("mouseenter", (e) => {
      if (!this.tablePosition["offsetLeft"]) {
        let offsetLeft = this.getElementLeft(e.target);
        let offsetTop = this.getElementTop(e.target);
        this.tablePosition = {
          ...this.tablePosition,
          offsetLeft,
          offsetTop,
        };
      }
    });
  }

  checkResize_col(x) {
    let sumWidth = this.side_width;
    for (let index = 0, len = this.colSize.length; index < len; index++) {
      const _width = this.colSize[index];
      sumWidth += _width;
      if (x > sumWidth - gapValue && x < sumWidth + gapValue) {
        this.colResizeSelector[0].style.left = sumWidth + "px";
        this.colResizeSelector[1].style.left = sumWidth - _width + "px";

        this.isMouseDown === false && this.addResizeListener("col", index);
        break;
      }
      if (sumWidth > x) {
        break;
      }
    }
  }

  checkResize_row(y) {
    let sumHeight = this.header_height;
    for (let index = 0, len = this.rowSize.length; index < len; index++) {
      const _height = this.rowSize[index];
      sumHeight += _height;
      if (y > sumHeight - gapValue && y < sumHeight + gapValue) {
        this.rowResizeSelector[0].style.top = sumHeight + "px";
        this.rowResizeSelector[1].style.top = sumHeight - _height + "px";
        this.isMouseDown === false && this.addResizeListener("row", index);
        break;
      }
      if (sumHeight > y) {
        break;
      }
    }
  }

  // 绘制文字
  _drawText({
    ctx,
    fontSize,
    color,
    fontWeight = "normal",
    str,
    row = 1,
    x,
    y,
    width,
    height,
    align = "left",
  }) {
    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    const textAllWidth = ctx.measureText(str).width;
    const rows = Math.ceil(textAllWidth / width);
    const rowCount = row <= rows ? row : rows;
    const lineHeightRatio = 1.5;
    const rowHeight = fontSize * lineHeightRatio;
    const textAllHeight = rowHeight * rowCount;
    // 以垂直居中，水平居中算
    const baseX = Math.max(0, (width - textAllWidth) / 2);
    const baseY = Math.max(0, (height - textAllHeight) / 2);

    let endPos = 0;
    for (let i = 0; i < rowCount; i++) {
      let restStr = str.slice(endPos);
      let rowWidth = 0;
      if (ctx.measureText(restStr).width > width) {
        for (let j = 0; j < restStr.length; j++) {
          rowWidth += ctx.measureText(restStr[j]).width;
          if (rowWidth > width) {
            if (i === row - 1) {
              ctx.fillText(
                restStr.slice(0, j - 1) + "...",
                x + baseX,
                y + i * fontSize * 1.5 + baseY
              );
            } else {
              ctx.fillText(
                restStr.slice(0, j),
                x + baseX,
                y + i * fontSize * 1.5 + baseY
              );
            }
            endPos += j;
            break;
          }
        }
      } else {
        ctx.fillText(
          restStr.slice(0),
          x + baseX,
          y + i * fontSize * 1.5 + baseY
        );
      }
    }
    ctx.restore();
  }

  addResizeListener(type, index) {
    const _this = this;
    let initX = 0,
      initY = 0,
      initValue = 0;

    document.addEventListener("mousemove", mousemoveHandler);
    document.addEventListener("mouseup", mouseupHandler);
    document.addEventListener("mousedown", mousedownHandler);

    function mouseupHandler(e) {
      _this.isMouseDown = false;
      document.removeEventListener("mousedown", mousedownHandler);
      document.removeEventListener("mousemove", mousemoveHandler);
      document.removeEventListener("mouseup", mouseupHandler);
    }
    function mousedownHandler(e) {
      initX = e.clientX;
      initY = e.clientY;
      _this.isMouseDown = true;
      initValue = type === "row" ? _this.rowSize[index] : _this.colSize[index];
    }
    function mousemoveHandler(e) {
      if (_this.isMouseDown) {
        let _x = e.clientX - initX,
          _y = e.clientY - initY;

        if (type === "row") {
          _this.rowSize[index] = initValue + _y;
          _this.draw_side();
        } else if (type === "col") {
          _this.colSize[index] = initValue + _x;
          _this.draw_header();
        }

        _this.draw_data();
      }
    }
  }
}
/**
 * 1. 计算单元格文字宽度 & 高度
 * 2. 计算当前行（当前列）宽度 & 高度
 */

/**
 * 初始化
 * 1. 设置 container
 * 2. 设置 canvas
 * 3. 设置 ctx
 */
Table.prototype.init = function () {
  if (this.el) {
    if (this.el.tagName.toUpperCase() !== CANVAS_TAGNAME) {
      var _canvas = document.createElement("canvas");
      _canvas.id = DEFAULT_CANVAS_ID;
      this.canvas = _canvas;
      this.el.appendChild(_canvas);
      console.warn(`you'd better to set a canvas tag`);
    } else {
      this.canvas = this.el;
    }
    this.ctx = this.canvas.getContext("2d");
  } else {
    throw new Error(
      'you should add a dom selector ,like <canvas id="canvas"></canvas>'
    );
  }
};

// 绘制表格外围容器
Table.prototype.draw_container = function () {
  this.canvas.width = this.width * this.scale;
  this.canvas.height = this.height * this.scale;
  this.canvas.style.width = this.width + "px";
  this.canvas.style.height = this.height + "px";
  this.ctx.scale(this.scale, this.scale);

  this.canvas.style.border = `${this.lineStyle.width}px ${this.lineStyle.style} ${this.lineStyle.color}`;
};

// 计算标准单元格尺寸
Table.prototype.calcCellSize = function () {
  this.col_width =
    (this.width + this.lineStyle.width - this.side_width) / this.columns.length;
  this.row_height =
    (this.height + this.lineStyle.width - this.header_height) /
    this.sides.length;

  this.colSize = new Array(this.columns.length).fill(this.col_width);
  this.rowSize = new Array(this.columns.length).fill(this.row_height);
};

// 绘制 table header
Table.prototype.draw_header = function () {
  var columns_length = this.columns.length;

  this.ctx.clearRect(0, 0, this.width, this.header_height);
  this.ctx.strokeStyle = this.lineStyle.color;
  let usedWidth = 0;
  for (var x = 0, len = columns_length; x < len; x++) {
    this.ctx.beginPath();
    this.ctx.moveTo(usedWidth + this.side_width, 0);
    this.ctx.lineTo(usedWidth + this.side_width, this.header_height);
    this.ctx.stroke();
    this.ctx.textBaseline = "top";
    const fontSize = this.fontSize.header;
    this._drawText({
      ctx: this.ctx,
      fontSize,
      fontWeight: "bold",
      color: "#ff5500",
      str: this.columns[x].title,
      row: 1,
      x: usedWidth + this.side_width,
      y: 0,
      width: this.colSize[x],
      height: this.header_height + fontSize / 2,
    });
    usedWidth += this.colSize[x];
  }
  this.ctx.beginPath();
  this.ctx.moveTo(0, this.header_height);
  this.ctx.lineTo(this.width - 2, this.header_height);
  this.ctx.stroke();
};

// 绘制 table 侧边栏
Table.prototype.draw_side = function () {
  var sides_length = this.sides.length;
  this.ctx.clearRect(0, 0, this.side_width, this.height);
  let usedHeight = 0;
  for (var y = 0, len = sides_length; y < len; y++) {
    this.ctx.beginPath();
    this.ctx.moveTo(0, usedHeight + this.header_height);
    this.ctx.lineTo(this.side_width, usedHeight + this.header_height);
    this.ctx.stroke();

    const fontSize = this.fontSize.size;
    this._drawText({
      ctx: this.ctx,
      fontSize,
      fontWeight: "bold",
      color: "#ff5500",
      str: this.sides[y].title,
      row: 3,
      x: 0,
      y: usedHeight + this.header_height,
      width: this.side_width,
      height: this.rowSize[y] + fontSize / 2,
    });
    usedHeight += this.rowSize[y];
  }
  this.ctx.beginPath();
  this.ctx.moveTo(this.side_width, 0);
  this.ctx.lineTo(this.side_width, this.height);
  this.ctx.stroke();
};

// 检测当前 cell 是否已经被占用渲染
Table.prototype.checkCellRender = function ({ rowIndex, colIndex, cell }) {
  const cell_key = `${rowIndex}_${colIndex}`;
  if (this.renderedCells[cell_key]) {
    return true;
  } else {
    let { row, col } = cell;
    let extraRows = [rowIndex],
      extraCols = [colIndex];
    let nowRow = rowIndex,
      nowCol = colIndex;
    while (row >= 2) {
      nowRow += 1;
      extraRows.push(nowRow);
      row--;
    }
    while (col >= 2) {
      nowCol += 1;
      extraCols.push(nowCol);
      col--;
    }

    extraRows.map((_row) => [
      extraCols.map((_col) => {
        const _cell_key = `${_row}_${_col}`;
        this.renderedCells[_cell_key] = 1;
      }),
    ]);
    return false;
  }
};

// 获取 cell info ， {x , y , width , height}
Table.prototype.getCellInfo = function (rowIndex, colIndex, cell) {
  let { row, col } = cell;
  let baseH = this.rowSize[rowIndex];
  let baseW = this.colSize[colIndex];
  let baseX = this.side_width;
  let baseY = this.header_height;
  //
  // if (rowIndex === this.rowSize.length - 1) {
  //   let all = this.rowSize.reduce((sum, item) => sum + item);
  //   baseH = this.height - (all - baseH);
  // }
  // if (colIndex === this.colSize.length - 1) {
  //   let all = this.colSize.reduce((sum, item) => sum + item);
  //   baseW = this.width - (all - baseW);
  // }
  //
  let initRowIndex = rowIndex,
    initColIndex = colIndex;
  while (initRowIndex > 0) {
    initRowIndex--;
    baseY += this.rowSize[initRowIndex];
  }
  while (initColIndex > 0) {
    initColIndex--;
    baseX += this.colSize[initColIndex];
  }

  initRowIndex = rowIndex;
  initColIndex = colIndex;
  while (row - 1 > 0) {
    initRowIndex++;
    baseH += this.rowSize[initRowIndex];
    row--;
  }
  while (col - 1 > 0) {
    initColIndex++;
    baseW += this.colSize[initColIndex];
    col--;
  }

  return {
    x: baseX,
    y: baseY,
    width: baseW,
    height: baseH,
  };
};
// 绘制 table cell
Table.prototype.draw_data = function () {
  this.renderedCells = {};
  this.ctx.clearRect(
    this.side_width,
    this.header_height,
    this.width - this.side_width,
    this.height - this.header_height
  );
  this.tableData.map((rows, rowIndex) => {
    rows.map((cell, colIndex) => {
      const { text } = cell;
      let cellIsRendered = this.checkCellRender({
        rowIndex: rowIndex + 1,
        colIndex: colIndex + 1,
        cell,
      });

      if (cellIsRendered) {
        return;
      }
      let sizeInfo = this.getCellInfo(rowIndex, colIndex, cell);
      var x = sizeInfo.x;
      var y = sizeInfo.y;

      // 绘制 cell 区域 border
      this.ctx.strokeRect(x, y, sizeInfo.width, sizeInfo.height);

      this.ctx.textBaseline = "top";
      const fontSize = this.fontSize.data;

      const contentWidth = sizeInfo.width - 10;
      const contentHeight = sizeInfo.height + fontSize / 2;
      this._drawText({
        ctx: this.ctx,
        fontSize,
        fontWeight: "bold",
        color: "#ff5500",
        str: text,
        row: 3,
        x: x + 5,
        y,
        width: contentWidth,
        height: contentHeight,
      });
    });
  });
};

// 获取元素绝对位置 left
Table.prototype.getElementLeft = function (element) {
  var actualLeft = element.offsetLeft;
  var current = element.offsetParent;

  while (current !== null) {
    actualLeft += current.offsetLeft;
    current = current.offsetParent;
  }

  return actualLeft;
};

// 获取元素绝对位置 top
Table.prototype.getElementTop = function (element) {
  var actualTop = element.offsetTop;
  var current = element.offsetParent;

  while (current !== null) {
    actualTop += current.offsetTop;
    current = current.offsetParent;
  }

  return actualTop;
};
