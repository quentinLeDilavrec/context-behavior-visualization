const vscode = acquireVsCodeApi();

d3.sankey = function () {
  let sankey = {},
    nodeWidth = 24,
    nodePadding = 8,
    size = [1, 1],
    nodes = [],
    links = [],
    maxNodeHeight = 50;

  sankey.nodeWidth = function (_) {
    if (!arguments.length) return nodeWidth;
    nodeWidth = +_;
    return sankey;
  };
  sankey.maxNodeHeight = function (_) {
    if (!arguments.length) return maxNodeHeight;
    maxNodeHeight = +_;
    return sankey;
  };

  sankey.nodePadding = function (_) {
    if (!arguments.length) return nodePadding;
    nodePadding = +_;
    return sankey;
  };

  sankey.nodes = function (_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return sankey;
  };

  sankey.links = function (_) {
    if (!arguments.length) return links;
    links = _;
    return sankey;
  };

  sankey.size = function (_) {
    if (!arguments.length) return size;
    size = _;
    return sankey;
  };

  sankey.layout = function (iterations) {
    computeLinkValues();
    computeNodeLinks();
    computeNodeValues();

    // big changes here
    // change the order and depths (y pos) won't need iterations
    computeNodeDepths();
    computeNodeBreadths(iterations);

    computeLinkDepths();
    return sankey;
  };

  sankey.relayout = function () {
    computeLinkDepths();
    return sankey;
  };

  // sankey.links = function(graph) {
  //   console.log(0,graph)
  //   return graph.links;
  // }

  sankey.link = function () {
    var curvature = .2;

    // x0 = line start X
    // y0 = line start Y

    // x1 = line end X
    // y1 = line end Y

    // y2 = control point 1 (Y pos)
    // y3 = control point 2 (Y pos)

    function link(d) {
      // big changes here obviously, more comments to follow
      console.log(d, d.source.targetLinks)
      var x0 = (d.source.dy - (d.source.sourceLinks.reduce((acc, x) => acc + x.dy, 0))) / 2 + d.source.x + d.sy + d.dy / 2,
        x1 = (d.target.dy - d.target.targetLinks.reduce((acc, x) => acc + x.dy, 0)) / 2 + d.target.x + d.ty + d.dy / 2,
        y0 = d.source.y + nodeWidth,
        y1 = d.target.y,
        yi = d3.interpolateNumber(y0, y1),
        y2 = yi(curvature),
        y3 = yi(1 - curvature);

      console.log(x0, x1)

      // ToDo - nice to have - allow flow up or down! Plenty of use cases for starting at the bottom,
      // but main one is trickle down (economics, budgets etc), not up

      return "M" + x0 + "," + y0        // start (of SVG path)
        + "C" + x0 + "," + y2      // CP1 (curve control point)
        + " " + x1 + "," + y3      // CP2
        + " " + x1 + "," + y1;       // end
    }

    link.curvature = function (_) {
      if (!arguments.length) return curvature;
      curvature = +_;
      return link;
    };

    return link;
  };

  // Populate the sourceLinks and targetLinks for each node.
  // Also, if the source and target are not objects, assume they are indices.
  function computeNodeLinks() {
    const node_dict = new Map()
    nodes.forEach(function (node) {
      node.sourceLinks = [];
      node.targetLinks = [];
      if (!node_dict.has(node.pos)) node_dict.set(node.pos, new Map())
      node_dict.get(node.pos).set(node.name, node)
    });
    links.forEach(function (link) {
      var source = link.source,
        target = link.target;
      if (typeof source === "number") source = link.source = nodes[link.source];
      if (typeof target === "number") target = link.target = nodes[link.target];
      if (typeof source === "string") source = link.source// = node_dict.get(link.pos).get(link.source);
      if (typeof target === "string") target = link.target// = node_dict.get(link.pos + 1).get(link.target);
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    });
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeLinkValues() {
    let max_v = 0
    links.forEach(link => {
      link.value = link.ngrams.reduce((acc, x) => Math.max(acc, x.pocc), 0);
      max_v = Math.max(max_v, link.value)
    })

    // links.forEach(link => {
    // link.value /= max_v * maxNodeHeight;
    // })
  }

  // Compute the value (size) of each node by summing the associated links.
  function computeNodeValues() {
    let max_v = 0
    nodes.forEach(function (node) {
      const max_flux = Math.max(
        d3.sum(node.sourceLinks, value),
        d3.sum(node.targetLinks, value)
      );
      if (node.pocc === undefined) throw 'error node.pocc is undefined'
      const diff = node.pocc - max_flux;
      if (diff < 0) throw new Error('node pocc smaller than usage un ngrams')
      // node.value = max_flux + Math.log1p(Math.log1p(Math.log1p(diff)));
      node.value = node.pocc
      max_v = Math.max(max_v, node.value)
    });
  }

  // TODO my: interger it
  // Take the list of nodes and create a DAG of supervertices, each consisting
  // of a strongly connected component of the graph
  //
  // Based on:
  // http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
  // // // function computeNodeStructure() {
  // // //   var nodeStack = [],
  // // //     index = 0;

  // // //   nodes.forEach(function (node) {
  // // //     if (!node.index) {
  // // //       connect(node);
  // // //     }
  // // //   });

  // // //   function connect(node) {
  // // //     node.index = index++;
  // // //     node.lowIndex = node.index;
  // // //     node.onStack = true;
  // // //     nodeStack.push(node);

  // // //     if (node.sourceLinks) {
  // // //       node.sourceLinks.forEach(function (sourceLink) {
  // // //         var target = sourceLink.target;
  // // //         if (!target.hasOwnProperty('index')) {
  // // //           connect(target);
  // // //           node.lowIndex = Math.min(node.lowIndex, target.lowIndex);
  // // //         } else if (target.onStack) {
  // // //           node.lowIndex = Math.min(node.lowIndex, target.index);
  // // //         }
  // // //       });

  // // //       if (node.lowIndex === node.index) {
  // // //         var component = [], currentNode;
  // // //         do {
  // // //           currentNode = nodeStack.pop()
  // // //           currentNode.onStack = false;
  // // //           component.push(currentNode);
  // // //         } while (currentNode != node);
  // // //         components.push({
  // // //           root: node,
  // // //           scc: component
  // // //         });
  // // //       }
  // // //     }
  // // //   }

  // // //   components.forEach(function (component, i) {
  // // //     component.index = i;
  // // //     component.scc.forEach(function (node) {
  // // //       node.component = i;
  // // //     });
  // // //   });
  // // // }

  // take a grouping of the nodes - the vertical columns
  // there shouldnt be 8 - there will be more, the total number of 1st level sources
  // then iterate over them and give them an incrementing x
  // because the data structure is ALL nodes, just flattened, don't just apply at the top level
  // then everything should have an X
  // THEN, for the Y
  // do the same thing, this time on the grouping of 8! i.e. 8 different Y values, not loads of different ones!
  function computeNodeBreadths(iterations) {

    let max_row_width = 0
    let max_row_node_count = 0
    const spacing = .05
    var nodesByBreadth = d3.nest()
      .key(function (d) { return d.pos > 0 ? d.pos * 2 : d.pos * -2 - 1; })
      .sortKeys(d3.ascending)
      .entries(nodes)
      .map(function (d) { return d.values; }) // values! we are using the values also as a way to seperate nodes (not just stroke width)?
      .map(nodes => {
        max_row_width = Math.max(max_row_width,
          nodes.reduce((acc, d) => acc + d.value, 0))
        max_row_node_count = Math.max(max_row_node_count, nodes.length)
        return nodes.sort((a, b) => b.value - a.value)
      }).map(nodes => {
        let left = 0
        // size[0] / 2 - (nodes.reduce((acc, d) => acc + d.value, 0)) / 2 / max_row_width * size[0] * (1 - spacing)
        // (size[0] * (1 - spacing) - nodes.reduce((acc, d) => acc + d.value, 0)) / 2 / max_row_width * size[0] * (1 - spacing)
        nodes.map((d) => {
          // d.y = size[1] / 2
          d.dy = (d.value) / max_row_width * size[0] * (1 - spacing) * .9
          d.x = left
          left += (spacing * size[0] / max_row_node_count) + d.dy//size[0] / 2 - d.dy / 2
          return d
        })
        const remaining = size[0] - left
        return nodes.map(node => {
          node.x += remaining / 2 * (1 - spacing)
          return node
        })
      })
    links.forEach(function (link) {
      link.dy = (link.value) / max_row_width * size[0] * (1 - spacing) * .9
    });


    console.log(size, nodesByBreadth)
    // // this bit is actually the node sizes (widths)
    // //var ky = (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value)
    // // this should be only source nodes surely (level 1)
    // var ky = (size[0] - (nodesByBreadth[0].length - 1) * nodePadding) / d3.sum(nodesByBreadth[0], value) / 4;
    // // I'd like them to be much bigger, this calc doesn't seem to fill the space!?

    // nodesByBreadth.forEach(function (nodes) {
    //   nodes.forEach(function (node, i) {
    //     node.x = i;
    //     node.dy = node.value * ky;
    //   });
    // });

    // links.forEach(function (link) {
    //   link.dy = link.value * ky;
    // });

    // resolveCollisions();

    // for (var alpha = 1; iterations > 0; --iterations) {
    //   relaxLeftToRight(alpha);
    //   resolveCollisions();

    //   relaxRightToLeft(alpha *= .99);
    //   resolveCollisions();
    // }

    // // these relax methods should probably be operating on one level of the nodes, not all!?

    // function relaxLeftToRight(alpha) {
    //   nodesByBreadth.forEach(function (nodes, breadth) {
    //     nodes.forEach(function (node) {
    //       if (node.targetLinks.length) {
    //         var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
    //         node.x += (y - center(node)) * alpha;
    //       }
    //     });
    //   });

    //   function weightedSource(link) {
    //     return center(link.source) * link.value;
    //   }
    // }

    // function relaxRightToLeft(alpha) {
    //   nodesByBreadth.slice().reverse().forEach(function (nodes) {
    //     nodes.forEach(function (node) {
    //       if (node.sourceLinks.length) {
    //         var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
    //         node.x += (y - center(node)) * alpha;
    //       }
    //     });
    //   });

    //   function weightedTarget(link) {
    //     return center(link.target) * link.value;
    //   }
    // }

    // function resolveCollisions() {
    //   nodesByBreadth.forEach(function (nodes) {
    //     var node,
    //       dy,
    //       x0 = 0,
    //       n = nodes.length,
    //       i;

    //     // Push any overlapping nodes right.
    //     nodes.sort(ascendingDepth);
    //     for (i = 0; i < n; ++i) {
    //       node = nodes[i];
    //       dy = x0 - node.x;
    //       if (dy > 0) node.x += dy;
    //       x0 = node.x + node.dy + nodePadding;
    //     }

    //     // If the rightmost node goes outside the bounds, push it left.
    //     dy = x0 - nodePadding - size[0]; // was size[1]
    //     if (dy > 0) {
    //       x0 = node.x -= dy;

    //       // Push any overlapping nodes left.
    //       for (i = n - 2; i >= 0; --i) {
    //         node = nodes[i];
    //         dy = node.x + node.dy + nodePadding - x0; // was y0
    //         if (dy > 0) node.x -= dy;
    //         x0 = node.x;
    //       }
    //     }
    //     node.x = Math.max(0, node.x)
    //   });
    // }

    // function ascendingDepth(a, b) {
    //   //return a.y - b.y; // flows go up
    //   return b.x - a.x; // flows go down
    //   //return a.x - b.x;
    // }
  }

  // this moves all end points (sinks!) to the most extreme bottom
  function moveSinksDown(y) {
    nodes.forEach(function (node) {
      if (!node.sourceLinks.length) {
        node.y = y - 1;
      }
    });
  }

  function moveSinksRight(x) {
    nodes.forEach(function (node) {
      if (!node.sourceLinks.length) {
        node.x = x - 1;
      }
    });
  }


  // shift their locations out to occupy the screen
  function scaleNodeBreadths(kx, min_y = 0) {
    nodes.forEach(function (node) {
      node.y -= min_y;
      node.y *= kx;
    });
  }


  function computeNodeDepths() {
    // var remainingNodes = nodes,
    //   nextNodes,
    //   y = 0;

    // while (remainingNodes.length && y < nodes.length) {
    //   nextNodes = [];
    //   remainingNodes.forEach(function (node) {
    //     node.y = y;
    //     //node.dx = nodeWidth;
    //     node.sourceLinks.forEach(function (link) {
    //       if (nextNodes.indexOf(link.target) < 0) {
    //         nextNodes.push(link.target);
    //       }
    //     });
    //   });
    //   remainingNodes = nextNodes;
    //   ++y;
    // }
    let min_y = 0
    let max_y = 0
    nodes.forEach(x => (min_y = Math.min(min_y, x.pos), max_y = Math.max(max_y, x.pos), x.y = x.pos))

    // move end points to the very bottom
    // moveSinksDown(y);
    scaleNodeBreadths((size[1] - nodeWidth) / ((max_y - min_y) - 1 + 1), min_y);
  }

  // .ty is the offset in terms of node position of the link (target)
  function computeLinkDepths() {
    nodes.forEach(function (node) {
      node.sourceLinks.sort(ascendingTargetDepth);
      node.targetLinks.sort(ascendingSourceDepth);
    });
    nodes.forEach(function (node) {
      var sy = 0, ty = 0;
      //ty = node.dy;
      node.sourceLinks.forEach(function (link) {
        link.sy = sy;
        sy += link.dy;
      });
      node.targetLinks.forEach(function (link) {
        // this is simply saying, for each target, keep adding the width of the link
        // so what if it was the other way round. start with full width then subtract?
        link.ty = ty;
        ty += link.dy;
        //ty -= link.dy;
      });
    });

    function ascendingSourceDepth(a, b) {
      //return a.source.y - b.source.y;
      return a.source.x - b.source.x;
    }

    function ascendingTargetDepth(a, b) {
      //return a.target.y - b.target.y;
      return a.target.x - b.target.x;
    }
  }

  function center(node) {
    return node.y + node.dy / 2;
  }

  function value(link) {
    return link.value;
  }

  return sankey;
};

function ngrams2graph({ ngrams, symb_stats }) {
  // const ngrams =
  //   [{ shift: 1, ngram: ["b", "a", "b"], pocc: 4, tocc: 3 },
  //   { shift: 2, ngram: ["b", "e", "a"], pocc: 4, tocc: 3 },
  //   { shift: 1, ngram: ["e", "a"], pocc: 4, tocc: 3 },
  //   { shift: 0, ngram: ["a"], pocc: 4, tocc: 3 },
  //   { shift: 0, ngram: ["a", "b"], pocc: 4, tocc: 3 },
  //   { shift: 0, ngram: ["a", "a"], pocc: 4, tocc: 3 },
  //   { shift: 2, ngram: ["e", "b", "a"], pocc: 4, tocc: 3 },
  //   { shift: 1, ngram: ["c", "a"], pocc: 4, tocc: 3 },
  //   { shift: 2, ngram: ["c", "c", "a"], pocc: 4, tocc: 3 },
  //   { shift: 3, ngram: ["c", "c", "c", "a"], pocc: 4, tocc: 3 },
  //   { shift: 0, ngram: ["a", "c", "c", "a"], pocc: 4, tocc: 3 },
  //   { shift: 0, ngram: ["a", "c", "c"], pocc: 4, tocc: 3 }];
  const links = {}
  const nodes = new Map()
  let common_prefix;
  {
    let l = Object.keys(symb_stats)
    common_prefix = l[0]
    l.slice(1).forEach(x => {
      let j = 0
      while (j < common_prefix.length && common_prefix.charAt(j) === x.charAt(j)) {
        j++
      }
      common_prefix = common_prefix.slice(0, j)
    })
  }
  ngrams.filter(x => x.pocc > 0).forEach((o_ngram) => {
    const { shift, ngram, pocc, tocc } = o_ngram
    o_ngram.refs = []
    if (!nodes.has(0 - shift)) nodes.set(0 - shift, new Map())
    if (!nodes.get(0 - shift).has(ngram[0]))
      nodes.get(- shift)
        .set(ngram[0], {
          name: ngram[0],
          pos: 0 - shift,
          ...symb_stats[ngram[0]]
        })
    for (let i = 0; i < ngram.length - 1; i++) {
      const pos = i - shift
      if (!nodes.has(pos + 1)) nodes.set(pos + 1, new Map())
      if (!nodes.get(pos + 1).has(ngram[i + 1])) nodes.get(pos + 1).set(ngram[i + 1], { name: ngram[i + 1], pos: pos + 1, ...symb_stats[ngram[i + 1]] })
      links['' + pos] = links['' + pos] || {}
      const source = nodes.get(pos).get(ngram[i])
      const target = nodes.get(pos + 1).get(ngram[i + 1])
      links['' + pos][source.name + target.name] = links['' + pos][source.name + target.name] || {
        pos: pos,
        source: source,
        target: target,
        ngrams: []
      }
      links['' + pos][source.name + target.name].ngrams.push(o_ngram)
      o_ngram.refs.push(links['' + pos][source.name + target.name])
    }
  })
  return {
    nodes: [...nodes.values()].reduce((acc, x) => [...acc, ...x.values()], []),
    // .map(x =>
    // (x.pocc = Math.log1p(Math.log1p(Math.log1p(x.pocc))), x.tocc = Math.log1p(Math.log1p(Math.log1p(x.tocc))), x)),
    links: Object.values(links).reduce((acc, x) => [...acc, ...Object.values(x)], []),
    common_prefix: common_prefix
  }
}

const test =
{
  nodes: [{
    name: '/packages/fct.js:1:0',
    pocc: 90,
    tocc: 3
  }, {
    name: '/packages/fct2.js:1:0',
    pocc: 90,
    tocc: 3
  }, {
    name: '/packages/fct.js:5:3',
    pocc: 80,
    tocc: 3
  }, {
    name: '/packages/fct.js:10:0',
    pocc: 90,
    tocc: 3
  }, {
    name: '/packages/fct.js:20:0',
    pocc: 20,
    tocc: 3
  }],
  links: [
    {
      source: "/packages/fct.js:1:0",
      target: "/packages/fct.js:5:3",
      pocc: 1,
      tocc: 0,
    },
    {
      source: "/packages/fct2.js:1:0",
      target: "/packages/fct.js:5:3",
      pocc: 4,
      tocc: 3,
    },
    {
      source: "/packages/fct.js:5:3",
      target: "/packages/fct.js:10:0",
      pocc: 5,
      tocc: 1,
    },
    {
      source: "/packages/fct.js:10:0",
      target: "/packages/fct.js:20:0",
      pocc: 7,
      tocc: 1,
    }]
}

const example =
{
  symb_stats: {
    "a": { pocc: 100, tocc: 3 },
    "b": { pocc: 50, tocc: 3 },
    "c": { pocc: 50, tocc: 3 },
    "d": { pocc: 25, tocc: 3 },
    "e": { pocc: 50, tocc: 3 },
    "f": { pocc: 10, tocc: 3 }
  },
  ngrams: [
    { shift: 1, ngram: ["b", "a", "b"], pocc: 4, tocc: 2 },
    { shift: 2, ngram: ["b", "e", "a"], pocc: 4, tocc: 2 },
    { shift: 1, ngram: ["e", "a"], pocc: 4, tocc: 2 },
    { shift: 1, ngram: ["e", "a", "a"], pocc: 4, tocc: 2 },
    { shift: 1, ngram: ["a", "a", "e"], pocc: 4, tocc: 2 },
    { shift: 1, ngram: ["a", "f", "a"], pocc: 4, tocc: 2 },
    { shift: 0, ngram: ["a", "a", "a"], pocc: 4, tocc: 2 },
    { shift: 0, ngram: ["a"], pocc: 4, tocc: 2 },
    { shift: 0, ngram: ["a", "b"], pocc: 4, tocc: 2 },
    { shift: 0, ngram: ["a", "a"], pocc: 4, tocc: 2 },
    { shift: 2, ngram: ["e", "b", "a"], pocc: 4, tocc: 2 },
    { shift: 1, ngram: ["c", "a"], pocc: 4, tocc: 2 },
    { shift: 2, ngram: ["c", "c", "a"], pocc: 4, tocc: 2 },
    { shift: 0, ngram: ["a", "c", "c"], pocc: 4, tocc: 2 }
  ]
}

const real = {
  symb_stats: {
    "createRunHook.js:12:0:71:1": { pocc: 2216, tocc: 2514 },
    "createCurrentHook.js:10:0:25:1": { pocc: 2016, tocc: 2000 },
    "createRemoveHook.js:17:0:77:1": { pocc: 1500, tocc: 3000 }
  },
  ngrams: [
    { shift: 0, ngram: ["createRunHook.js:12:0:71:1"], pocc: 2216, tocc: 2514 },
    { shift: 0, ngram: ["createRunHook.js:12:0:71:1", "createCurrentHook.js:10:0:25:1"], pocc: 1108, tocc: 1257 },
    { shift: 0, ngram: ["createRunHook.js:12:0:71:1", "createRunHook.js:12:0:71:1"], pocc: 1108, tocc: 1257 },
    { shift: 1, ngram: ["createRemoveHook.js:17:0:77:1", "createRunHook.js:12:0:71:1"], pocc: 1108, tocc: 1257 }
  ]
}

function draw_behavior_graph(resources = undefined) {
  if (resources === undefined) {
    if (this.resources === undefined) {
      throw 'need resources representing the ngrams'
    }
    resources = this.resources
  } else {
    this.resources = resources
  }

  var units = "Widgets";

  // set the dimensions and margins of the graph
  var margin = { top: 0, right: 0, bottom: 0, left: 0 },
    width = window.innerWidth * 0.8 - margin.left - margin.right,
    height = window.innerHeight * 0.8 - margin.top - margin.bottom;
  // format variables
  var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function (d) { return formatNumber(d) + " " + units; },
    color = d3.scaleOrdinal(d3.schemeCategory10);
  // append the svg object to the body of the page
  document.getElementById('chart').innerHTML = ""
  var real_svg = d3.select("div#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  const svg = real_svg
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");


  const max_ngram_len = Math.max(...resources.ngrams.map(x => (console.log(x), x.ngram.length)))
  // Set the sankey diagram properties
  var sankey = d3.sankey()
    .nodeWidth(36)
    .maxNodeHeight(width * .4)
    .nodePadding(40)
    .size([width, height + (max_ngram_len > 8 ? 100 * (max_ngram_len - 8) : 0)]);

  var path = sankey.link();

  //usage:
  Promise.resolve(resources)
    .then(ngrams2graph)
    // load the data
    // d3.json(window.mypath)
    .then(function (graph) {
      sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout(32);
      if (max_ngram_len > 8) {
        real_svg
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom + 100 * (max_ngram_len - 8))
      }

      const max_tocc = Math.max(...Object.values(graph.nodes).map(x => x.tocc))
      console.log(graph.links)
      const max_tocc_links = Math.max(...graph.links.map(x=>Math.max(...x.ngrams.map(x=>x.tocc)))) || 0//...Object.values(graph.links).map(x => x.tocc))
      console.log(max_tocc_links)

      // add in the links
      var link = svg.append("g").selectAll(".link")
        .data(graph.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", path)
        .style("stroke-width", function (d) { return Math.max(1, d.dy); })

        .sort(function (a, b) { return b.dy - a.dy; })
        .on("click", function (d) {
          if (d3.event.defaultPrevented) return;
          console.log(`collapse ${d.source.name} → ${d.target.name}`);
        })
        .on("mouseover", (d, i) => {
          const others = d.ngrams.reduce((acc, x) => [...acc, ...x.refs], [])
          const tmp = d3.selectAll(".link")
            .filter(function (d) {
              return others.findIndex(x => d === x) > -1
            })
          tmp
            .style("stroke", function (d) {
              const col = d3.rgb('red')
              col.opacity = Math.max(.2, 1 - (d.tocc / max_tocc_links))
              return d.color = col;
            })
        })
        .on("mouseout", (d, i) => {
          d3.selectAll(".link")
            // .filter(function (d) {
            //   return true
            // })
            .style("stroke", function (d) {
              const col = d3.rgb('grey')
              col.opacity = Math.max(.2, 1 - (d.tocc / max_tocc_links))
              return d.color = col;
            })
        })
      // add the link titles
      link.append("title")
        .text(function (d) {
          return `used ${
            d.ngrams.reduce((acc, x) => acc + x.pocc, 0)
            } times in production but only ${
            d.ngrams.reduce((acc, x) => acc + x.tocc, 0)
            } times in tests\n` +
            d.source.name + " → " +
            d.target.name + "\n";
        });

      // add in the nodes
      var node = svg.append("g").selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        })
        .on("click", function (d) {
          if (d3.event.defaultPrevented) return;
          if (window.event.ctrlKey) {
            vscode.postMessage({
              command: 'jump',
              position: d.name
            })
            console.log(`go to ${d.name}`);
          } else {
            function find_inits() {
              const root_symbols = new Map()
              d.sourceLinks.forEach(link =>
                link.ngrams.forEach(ngram =>
                  root_symbols.set('prev:' + ngram.ngram[ngram.shift],
                    { dir: 'prev', init: ngram.ngram[ngram.shift], meta: 0 })//TODO get meta value to make multi functions comp
                ))
              d.targetLinks.forEach(link =>
                link.ngrams.forEach(ngram =>
                  root_symbols.set('next:' + ngram.ngram[ngram.shift],
                    { dir: 'next', init: ngram.ngram[ngram.shift], meta: 0 })//TODO get meta value to make multi functions comp
                ))
              return [...root_symbols.values()]
            }
            // console.log('more', d, {
            //   command: 'req_ngrams',
            //   inits_and_directions: find_inits()
            // })
            vscode.postMessage({
              command: 'req_ngrams',
              inits_and_directions: find_inits()
            })
          }
        })
        .on("dblclick", function (d) {
          if (d3.event.defaultPrevented) return;
          console.log(`do something with double click`);
        })
        .call(d3.drag()
          .subject(function (d) {
            return d;
          })
          // TODO look at what is does
          // .on("start", function () {
          //   this.parentNode.appendChild(this);
          // })
          .on("drag", dragmove));

      function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      }
      // add the rectangles for the nodes
      node.append("rect")
        .attr("height", sankey.nodeWidth())
        .attr("width", function (d) { return d.dy; })
        .style("fill", function (d) {
          const col = d3.rgb(color(d.name.replace(/ .*/, "")))
          col.opacity = Math.max(.1, 1 - (d.tocc / max_tocc))
          return d.color = col;
        })
        .style("stroke", function (d) {
          const col = d3.rgb(d.color).darker(2)
          col.opacity = 1
          return col;
        })
        .append("title")
        .text(function (d) {
          return d.name + "\n" + `used ${d.pocc} times in production but only ${d.tocc} times in tests`;//format(d.value);
        });

      // add in the title for the nodes
      const dy = 0
      const max_size_scale = 9.5
      node.append("text")
        .attr("text-anchor", "middle")
        //.attr("transform", "rotate(-20)")
        .attr("x", function (d) { return d.dy / 2 })
        .attr("y", sankey.nodeWidth() / 2)
        .attr("dy", `${dy}px`)
        // .text(function (d) { return d.name; })
        .text(function (d) {
          const max_size = Math.floor(d.dy / max_size_scale)
          const tmp_name = d.name.length === graph.common_prefix.length ? d.name : d.name.slice(graph.common_prefix.length)
          if (tmp_name.length > max_size) {
            return (max_size - 3 <= 0) ?
              '' :
              tmp_name.substring(0, max_size - 3) + "...";
          } else return tmp_name;
        });

      d3.selectAll(".link")
        .style("stroke", function (d) {
          const col = d3.rgb('grey')
          col.opacity = Math.max(.2, 1 - (d.tocc / max_tocc_links))
          return d.color = col;
        })
      // sankey.relayout();

      // the function for moving the nodes
      function dragmove(d) {
        d3.select(this).attr("transform",
          `translate(${
          (d.x = Math.max(width * (1 - .9) / 2, Math.min(width - width * (1 - .9) / 2 - d.dy, d3.event.x)))
          }, ${d.y})`);
        sankey.relayout();
        link.attr("d", path);
      }
      const chart = document.getElementById('chart')
      const b = document.createElement('h1')
      b.innerHTML = graph.common_prefix
      chart.insertAdjacentElement('afterbegin', b);
    });



}

window.addEventListener('message', event => {
  const message = event.data;
  console.log('message:', message)
  draw_behavior_graph(message)
})

function settings_setup() {
  const settings = document.getElementById('settings')
  {
    const b = document.createElement('button')
    b.innerHTML = 'redraw'
    // Update the current slider value (each time you drag the slider handle)
    b.onclick = function () {
      draw_behavior_graph()
    }
    settings.appendChild(b);
  }
  {
    const slider = document.createElement('input')
    const container = document.createElement('div')
    slider.type = 'range'
    slider.min = '1'
    slider.max = '100'
    slider.value = 5
    container.innerHTML = slider.value; // Display the default slider value

    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function () {
      container.innerHTML = this.value;
    }
    settings.appendChild(slider);
    settings.appendChild(container);
  }
}

settings_setup();

vscode.postMessage({
  command: 'ready'
})