'use strict';

const chisel = require('./chisel-utils.js');

const findPort = (comp, busDef) => {
  const aType = busDef.abstractionTypes.find(e => e.viewRef === 'RTLview');
  // const datPort = aType.portMaps.find(e => e.logicalPort.name === 'BITS');
  // const datName = datPort.physicalPort.name;
  const datName = aType.portMaps.BITS;
  return comp.model.ports.find(e => e.name === datName);
};

const masterWiringGen = comp => e =>
  `val ${e.name}Node = new Object { // channel master wiring
  def out(x: Int) = {
    val y = IO(Decoupled(${chisel.convertType(findPort(comp, e).wire.width)}))
      y.suggestName("${e.name}")
      (y, Nil)
    }
  }
`;

const slaveWiringGen = comp => e =>
  `val ${e.name}Node = new Object { // channel slave wiring
  def in(x: Int) = {
    val y = IO(Flipped(Decoupled(${chisel.convertType(findPort(comp, e).wire.width)})))
      y.suggestName("${e.name}")
      (y, Nil)
    }
  }
`;

const commonAttachGen = comp =>
  (comp.busInterfaces.find(e => e.busType.name === 'channel'))
    ? `bap.pbus.coupleTo("channels") { ${comp.name}_top.channelsNode := TLFragmenter(bap.pbus) := _ }`
    : '// no channel attachment';

const commonNodeGen = comp => {
  if (comp.busInterfaces.find(e => e.busType.name === 'channel')) {

    return `
  val channelsNode = TLRegisterNode(
    address = Seq(AddressSet(0xA0000000L, 0xFFF)),
    device = imp.device,
    beatBytes = 8
  )

  InModuleBody {

${comp.busInterfaces
    .filter(e => e.busType.name === 'channel')
    .map(e => `    val ${e.name}_queue = Module(new Queue(${chisel.convertType(findPort(comp, e).wire.width)}, 4))`)
    .join('\n')
}

${comp.busInterfaces
    .filter(e => (e.busType.name === 'channel' && e.interfaceMode === 'slave'))
    .map(e => `    imp.module.${e.name}0 <> ${e.name}_queue.io.deq`)
    .join('\n')
}

${comp.busInterfaces
    .filter(e => (e.busType.name === 'channel' && e.interfaceMode === 'master'))
    .map(e => `    ${e.name}_queue.io.enq <> imp.module.${e.name}0`)
    .join('\n')
}

    channelsNode.regmap(
${
  comp.busInterfaces
    .filter(e => (e.busType.name === 'channel' && e.interfaceMode === 'slave'))
    .map(e => `RegFieldGroup("${e.name}",Some("${e.name} target channel"), NonBlockingEnqueue(${e.name}_queue.io.enq, 64))`)
    .concat(
      comp.busInterfaces
        .filter(e => (e.busType.name === 'channel' && e.interfaceMode === 'master'))
        .map(e => `RegFieldGroup("${e.name}",Some("${e.name} initiator channel"), NonBlockingDequeue(${e.name}_queue.io.deq, 64))`)
    )
    .map((e, i) => `      ${i * 8} -> ${e}`)
    .join(',\n')
}
    )
  }`;
  }
  return '// no channel node';
};

module.exports = {
  common: {
    adapter: () => '// channel common adapter',
    node: commonNodeGen,
    attach: commonAttachGen
  },
  master: {
    adapter: () => () => '0 // channel master adapter',
    params: () => e => `case class P${e.name}Params () // channel master params`,
    // node: () => () => '// channel master node',
    attach: () => () => '// channel master attach',
    wiring: masterWiringGen
  },
  slave: {
    adapter: () => () => '0 // channel slave adapter',
    params: () => e => `case class P${e.name}Params () // channel slave params`,
    // node: () => () => '// channel slave node',
    attach: () => () => '// channel master attach',
    wiring: slaveWiringGen
  },
  busDef: {
    valid: 1,
    ready: -1,
    bits: 'WIDTH'
  }
};
