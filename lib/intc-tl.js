'use strict';

const masterAdapterGen = () => p => `IntSourceNode(IntSourcePortSimple(
    num = ${Object.keys(p.abstractionTypes[0].portMaps).length},
    resources = device.int
  ))`;

const masterBusParamsGen = () => p => `
case class P${p.name}Params()
`;

const masterNodeGen = () => e => `
val ${e.name}Node: IntSourceNode = imp.${e.name}Node`;

const masterAttachGen = comp => e => `bap.ibus := ${comp.name}_top.${e.name}Node`;

const fixme = () => `
// FIXME`;

module.exports = {
  master: {
    adapter: masterAdapterGen,
    params: masterBusParamsGen,
    node: masterNodeGen,
    attach: masterAttachGen,
    wiring: () => () => ''
  },
  slave: {
    adapter: masterAdapterGen,
    params: masterBusParamsGen,
    node: fixme,
    attach: fixme,
    wiring: () => () => ''
  },
  busDef: []
};
