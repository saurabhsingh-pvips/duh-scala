[![NPM version](https://img.shields.io/npm/v/duh-scala.svg)](https://www.npmjs.org/package/duh-scala)
[![Travis build Status](https://travis-ci.org/sifive/duh-scala.svg?branch=master)](https://travis-ci.org/sifive/duh-scala)

DUH component export to Scala

## Use

```
npm i duh-scala
```

To export a scala blackbox wrapper and attach method
```bash
duh-export-scala <mycomp>.json5 -o <output-dir>
```

To export a `RegisterRouter` corresponding the the `memoryMap`s in a duh component
```bash
duh-export-regmap <mycomp>.json5 -o <output-dir>
```

To export a scala blackbox wrapper and attach method for a monitor
```bash
duh-export-monitor <mycomp>.json5 -o <output-dir>
```

## API
The hierarchy of the output modules is looks like
```
top: N${name}Top
└── imp: L${name}
    └── blackbox: ${name}
```
The reason for having two layers of wrapping is to separate the purely
combinational wrapper logic from the sequential logic. The inner `L${name}Top`
module only contains combinational wrapper logic while the outer `N${name}Top`
module contains sequential logic


The `L${name}` module contains the node declarations, blackbox instantiation,
and connections between node bundles and blackbox ports. There is also an
`extraResources` method that is called when the DTS datastructure is
constructed. The fields returned by this method are included in the entry
corresponding the component in the DTS.
```scala
class L${name}Base(c: ${name}Params)(implicit p: Parameters) extends LazyModule {

  // device declaration
  val device = new SimpleDevice("${name}", Seq("sifive,${name}-${version}")) {
    ...
  }

  // extra fields to include in the entry of this device in the DTS
  def extraResources(resources: ResourceBindings) = Map[String, Seq[ResourceValue]]()

  // node declarations
  val axiNode = ...
  val apbNode = ...
  ...

  // blackbox instantiation and wiring
  lazy val module = new L${name}BaseImp
}
```

The corresponding user class that extends `L${name}Base` looks like
```scala
class L${name}(c: ${name}Params)(implicit p: Parameters) extends L${name}Base(c)(p)
{

// User code here

}
```

To add another integer field called `data-width` and string field called `name`
you would add the following code into the user `L${name}` class.
```scala
  override def extraResources(resources: ResourceBindings) =
      Map("data-width" -> Seq(ResourceInt(dataWidth)),
        "name" -> Seq(ResourceString(name)))
```

The result should look like
```scala
class L${name}(c: ${name}Params)(implicit p: Parameters) extends L${name}Base(c)(p)
{
  override def extraResources(resources: ResourceBindings) =
      Map("data-width" -> Seq(ResourceInt(dataWidth)),
        "name" -> Seq(ResourceString(name)))
}
```



The `N${name}` module contains methods to instantate tilelink adapters for the
nodes. It also contains a method called `userOM` that is called when the object
model of the component is constructed. The object returned by `userOM` is
included with the base object model. This can be overrided to include arbitrary
information in the object model and defaults to empty. The value returned by
this method should be an instance of a `case class` which is why it returns
`Product with Serializable`.
```scala
class N${name}TopBase(val c: N${name}TopParams)(implicit p: Parameters) extends SimpleLazyModule
  with BindingScope {

  // userOM method
  def userOM: Product with Serializable = Nil

  // adapter methods
  def getaxilNodeTLAdapter(): TLInwardNode = ...
  def getahblNodeTLAdapter(): TLInwardNode = ...
  ...
}
```


The corresponding user class that extends `N${name}Base` looks like
```scala
class N${name}Top(c: N${name}TopParams)(implicit p: Parameters) extends N${name}TopBase(c)(p)
{

// User code here

}
```

To add the following fields to the `OMDevice` of the component
```javascript
foo: "foo",
foobar: {
  foo: "foo",
  bar: "bar"
}
```

add the following code to the user `N${name}` define the following case class
```
case class MyOM(foo: String, foobar: Map[String, String])
```

and add the following code to `N${name}`
```scala
  override def userOM = new MyOM("foo", Map("foo" -> "foo", "bar" -> "bar"))
```

The result should look like
```scala
class N${name}Top(c: N${name}TopParams)(implicit p: Parameters) extends N${name}TopBase(c)(p)
{
  override def userOM = new MyOM("foo", Map("foo" -> "foo", "bar" -> "bar"))
}
```

And the output object model should look like
```javascript
{
  "foo" : {
    "foo" : "foo",
    "bar" : "bar"
  },
  "memoryRegions" : [ ... ],
  "interrupts" : [ ... ],
  "_types" : [ "OM${name}", "OMDevice", "OMComponent", "OMCompoundType" ]
}
```


## Testing
```
npm test
```

## License
Apache 2.0 [LICENSE](LICENSE).
