/**
 * Created by mbebenita on 10/21/14.
 */

module J2ME.C4.IR {
  export class JVMNewArray extends Value {
    constructor(public control: Control, public kind: Kind, public length: Value) {
      super();
    }
    visitInputs(visitor: NodeVisitor) {
      visitor(this.control);
      visitor(this.length);
    }
  }

  JVMNewArray.prototype.nodeName = "JVMNewArray";

  export class JVMStoreIndexed extends StoreDependent {
    constructor(control: Control, store: Store, public kind: Kind, public array: Value, public index: Value, public value: Value) {
      super(control, store);
    }
    visitInputs(visitor: NodeVisitor) {
      visitor(this.control);
      visitor(this.store);
      this.loads && visitArrayInputs(this.loads, visitor);
      visitor(this.array);
      visitor(this.index);
      visitor(this.value);
    }
  }

  JVMStoreIndexed.prototype.nodeName = "JVMStoreIndexed";

  export class JVMLoadIndexed extends StoreDependent {
    constructor(control: Control, store: Store, public kind: Kind, public array: Value, public index: Value) {
      super(control, store);
    }
    visitInputs(visitor: NodeVisitor) {
      visitor(this.control);
      visitor(this.store);
      this.loads && visitArrayInputs(this.loads, visitor);
      visitor(this.array);
      visitor(this.index);
    }
  }

  JVMLoadIndexed.prototype.nodeName = "JVMLoadIndexed ";

  export class JVMConvert extends Value {
    constructor(public from: Kind, public to: Kind, public value: Value) {
      super();
    }
    visitInputs(visitor: NodeVisitor) {
      visitor(this.value);
    }
  }

  JVMConvert.prototype.nodeName = "JVMConvert";

  export class JVMCallProperty extends StoreDependent {
    constructor(control: Control, store: Store, public state: State, public object: Value, public name: Value, public args: Value [], public flags: number) {
      super(control, store);
      this.handlesAssignment = true;
    }
    visitInputs(visitor: NodeVisitor) {
      this.control && visitor(this.control);
      this.store && visitor(this.store);
      this.loads && visitArrayInputs(this.loads, visitor);
      visitor(this.object);
      visitor(this.name);
      visitArrayInputs(this.args, visitor);
    }
  }

  JVMCallProperty.prototype.nodeName = "JVMCallProperty";
}

module J2ME.C4.Backend {
  IR.JVMNewArray.prototype.compile = function (cx: Context): AST.Node {
    var jsTypedArrayType: string;
    switch (this.kind) {
      case Kind.Int:
        jsTypedArrayType = "Int32Array";
        break;
      case Kind.Short:
        jsTypedArrayType = "Int16Array";
        break;
      case Kind.Byte:
        jsTypedArrayType = "Int8Array";
        break;
      case Kind.Float:
        jsTypedArrayType = "Float32Array";
        break;
      case Kind.Long:
        jsTypedArrayType = "Float64Array"; // Tricky.
        break;
      case Kind.Double:
        jsTypedArrayType = "Float64Array";
        break;
      default:
        throw Debug.unexpected(this.kind);
    }
    return new AST.NewExpression(new AST.Identifier(jsTypedArrayType), [compileValue(this.length, cx)]);
  }

  IR.JVMStoreIndexed.prototype.compile = function (cx: Context): AST.Node {
    var array = compileValue(this.array, cx);
    var index = compileValue(this.index, cx);
    var value = compileValue(this.value, cx);
    return assignment(new AST.MemberExpression(array, index, true), value);
  }

  IR.JVMLoadIndexed.prototype.compile = function (cx: Context): AST.Node {
    var array = compileValue(this.array, cx);
    var index = compileValue(this.index, cx);
    return new AST.MemberExpression(array, index, true);
  }

  IR.JVMConvert.prototype.compile = function (cx: Context): AST.Node {
    var value = compileValue(this.value, cx);
    // bdahl: Add all the conversions here.
    debugger;
    return new AST.BinaryExpression("|", value, constant(0));
  }

  IR.JVMCallProperty.prototype.compile = function (cx: Context): AST.Node {
    var local = this.state.local;
    var stack = this.state.stack;

    var localValues = [];
    var stackValues = [];

    var $ = new AST.Identifier("$");
    for (var i = 0; i < local.length; i++) {
      if (local[i] === null) {
        continue;
      }
      localValues.push(compileValue(local[i], cx));
    }
    for (var i = 0; i < stack.length; i++) {
      if (stack[i] === null) {
        continue;
      }
      stackValues.push(compileValue(stack[i], cx));
    }

    var object = compileValue(this.object, cx);
    var name = compileValue(this.name, cx);
    var callee = property(object, name);
    var args = this.args.map(function (arg) {
      return compileValue(arg, cx);
    });
    var callNode;
    if (this.flags & IR.Flags.PRISTINE) {
      callNode = call(callee, args);
    } else {
      callNode = callCall(callee, object, args);
    }

    var exception = new AST.Identifier("e");
    var to = new AST.Identifier(this.variable.name);
    cx.useVariable(this.variable);

    return new AST.TryStatement(
      new AST.BlockStatement([assignment(to, callNode)]),
      new AST.CatchClause(exception, null,
        new AST.BlockStatement([ // Ask mbx: is it bug I need ExpressionStatement here to get the semicolon inserted.
          new AST.ExpressionStatement(new AST.CallExpression(new AST.Identifier("ctx.JVMBailout"), [
            exception,
            new AST.Identifier("methodInfoId"),
            new AST.Identifier("frameIndex"),
            new AST.Literal(this.state.bci),
            new AST.ArrayExpression(localValues),
            new AST.ArrayExpression(stackValues)
          ])),
          new AST.ThrowStatement(exception)
        ])
      ),
      [],
      null
    );
  }
}
