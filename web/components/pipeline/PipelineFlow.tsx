'use client'

import { useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import TaskNode from './TaskNode'
import WorkerNode from './WorkerNode'
import DeployNode from './DeployNode'
import JudgeNode from './JudgeNode'
import WaitingNode from './WaitingNode'

import type {
  Job,
  IdeationIdea,
  EvaluatorSpec,
  DeploymentResult,
  TaskPhase,
} from '../../hooks/useTaskStream'

// ─── Node type registry ─────────────────────────────────────────

const nodeTypes = {
  taskNode: TaskNode,
  workerNode: WorkerNode,
  deployNode: DeployNode,
  judgeNode: JudgeNode,
  waitingNode: WaitingNode,
}

// ─── Layout constants (neural-net columns) ──────────────────────

const COL_TASK = 0
const COL_WORKER = 380
const COL_DEPLOY = 740
const COL_JUDGE = 1100
const ROW_SPACING = 340
const ROW_OFFSET = 50

const EDGE_STYLE: Partial<Edge> = {
  animated: true,
  style: { stroke: 'rgba(3, 141, 57, 0.35)', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(3, 141, 57, 0.35)' },
}

const EDGE_ACTIVE: Partial<Edge> = {
  animated: true,
  style: { stroke: 'rgba(3, 141, 57, 0.6)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(3, 141, 57, 0.6)' },
}

const EDGE_DASHED: Partial<Edge> = {
  animated: false,
  style: { stroke: 'rgba(3, 141, 57, 0.12)', strokeWidth: 1, strokeDasharray: '5 4' },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(3, 141, 57, 0.12)' },
}

// ─── Build nodes & edges from state ─────────────────────────────

interface PipelineState {
  phase: TaskPhase
  taskDescription: string
  ideas: IdeationIdea[]
  jobs: Job[]
  allDonePayload: { evaluator: EvaluatorSpec | null; builds: DeploymentResult[] } | null
  workerCount: number
  evaluator: EvaluatorSpec | null
}

function buildElements(state: PipelineState): { nodes: Node[]; edges: Edge[] } {
  const { phase, taskDescription, ideas, jobs, allDonePayload, workerCount, evaluator } = state
  const nodes: Node[] = []
  const edges: Edge[] = []

  // How many rows?  Workers determine the row count.
  const rowCount = Math.max(jobs.length, ideas.length, workerCount, 1)
  const totalHeight = (rowCount - 1) * ROW_SPACING
  const startY = -totalHeight / 2

  // ── Column 0: Task ────────────────────────────────────────
  nodes.push({
    id: 'task',
    type: 'taskNode',
    position: { x: COL_TASK, y: 0 },
    data: { description: taskDescription },
  })

  // ── Column 1: Workers (or waiting placeholders) ───────────
  const hasJobs = jobs.length > 0

  for (let i = 0; i < rowCount; i++) {
    const y = startY + i * ROW_SPACING + ROW_OFFSET
    const job = hasJobs ? jobs[i] : undefined

    if (job) {
      const workerId = `worker-${job.jobId}`
      nodes.push({
        id: workerId,
        type: 'workerNode',
        position: { x: COL_WORKER, y },
        data: { job, index: i },
      })
      edges.push({
        id: `task-${workerId}`,
        source: 'task',
        target: workerId,
        ...EDGE_ACTIVE,
      } as Edge)

      // ── Column 2: Deploy preview ──────────────────────────
      if (job.deploymentUrl) {
        const deployId = `deploy-${job.jobId}`
        nodes.push({
          id: deployId,
          type: 'deployNode',
          position: { x: COL_DEPLOY, y },
          data: { url: job.deploymentUrl, index: i },
        })
        edges.push({
          id: `${workerId}-${deployId}`,
          source: workerId,
          target: deployId,
          ...EDGE_ACTIVE,
          style: { stroke: 'rgba(3, 141, 57, 0.6)', strokeWidth: 2 },
        } as Edge)
        // deploy → judge
        edges.push({
          id: `${deployId}-judge`,
          source: deployId,
          target: 'judge',
          ...EDGE_STYLE,
        } as Edge)
      } else {
        // worker → judge (dashed, waiting for deploy)
        edges.push({
          id: `${workerId}-judge`,
          source: workerId,
          target: 'judge',
          ...EDGE_DASHED,
        } as Edge)
      }
    } else {
      // Waiting placeholder
      const waitId = `wait-${i}`
      nodes.push({
        id: waitId,
        type: 'waitingNode',
        position: { x: COL_WORKER, y },
        data: { label: `Worker ${i + 1} — waiting…`, index: i },
      })
      edges.push({
        id: `task-${waitId}`,
        source: 'task',
        target: waitId,
        ...EDGE_DASHED,
      } as Edge)
      edges.push({
        id: `${waitId}-judge`,
        source: waitId,
        target: 'judge',
        ...EDGE_DASHED,
      } as Edge)
    }
  }

  // ── Column 3: Judge ───────────────────────────────────────
  const deployedCount = jobs.filter(j => j.status === 'deployed').length
  nodes.push({
    id: 'judge',
    type: 'judgeNode',
    position: { x: COL_JUDGE, y: 0 },
    data: {
      evaluator: allDonePayload?.evaluator ?? evaluator,
      builds: allDonePayload?.builds ?? [],
      done: phase === 'done',
      deployedCount,
      totalJobs: jobs.length || workerCount,
    },
  })

  return { nodes, edges }
}

// ─── Inner component (needs useReactFlow context) ───────────────

function PipelineFlowInner(props: PipelineState) {
  const { nodes, edges } = useMemo(() => buildElements(props), [props])
  const { fitView } = useReactFlow()
  const prevNodeCount = useRef(0)

  // Re-fit when node count changes (new workers appear, deploys arrive)
  useEffect(() => {
    if (nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length
      // Small delay to let React Flow render the new nodes
      const t = setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 80)
      return () => clearTimeout(t)
    }
  }, [nodes.length, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.15}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      zoomOnScroll
    >
      <Background color="rgba(3, 141, 57, 0.06)" gap={32} size={1} />
      <Controls
        showInteractive={false}
        className="!bg-bg-dark/80 !border-border-green !rounded-lg"
      />
    </ReactFlow>
  )
}

// ─── Exported wrapper (provides ReactFlowProvider) ──────────────

export default function PipelineFlow(props: PipelineState) {
  return (
    <ReactFlowProvider>
      <PipelineFlowInner {...props} />
    </ReactFlowProvider>
  )
}
