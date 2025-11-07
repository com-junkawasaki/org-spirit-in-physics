'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTimelineData } from '../hooks/useTimelineData'
import TimelineChart from './timeline/TimelineChart'
import KPICards from './timeline/KPICards'
import Force3DControls from './timeline/Force3DControls'
import type {
  TimelineVisualizationProps,
  ForcePreset,
  WordNode,
  WordLink,
  DebugInfo
} from '../types'
import type { TimelineDataPoint } from '@/generated/graphql'
import { JUNG_STIMULUS_WORDS } from '../constants/jung'
import ReactFlow, {
  useNodesState,
  useEdgesState,
  useReactFlow
} from '@xyflow/react'