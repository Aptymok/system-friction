export function publishCognitiveTaskGraph(
  graph: any
) {

  return {

    ok:
      true,

    published:
      true,

    taskGraph:
      graph,

    graph,

    logbookId:
      graph?.logbookId ??
      crypto.randomUUID(),

    error:
      null,

    details:
      null,

    event: {

      type:
        "SFI_TASK_GRAPH_PUBLISHED",

      timestamp:
        new Date().toISOString()

    }

  };

}
