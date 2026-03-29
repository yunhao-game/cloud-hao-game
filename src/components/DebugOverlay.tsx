import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

// 调试步骤类型
export interface DebugStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  data?: any;
  timestamp?: number;
}

// 调试状态
interface DebugState {
  enabled: boolean;
  steps: DebugStep[];
  currentStepId: number;
}

const DEBUG_STEPS = [
  { id: 1, name: '步骤1: 用户点击节点' },
  { id: 2, name: '步骤2: handleNodeSelect 调用' },
  { id: 3, name: '步骤3: 设置 selectedNode 状态' },
  { id: 4, name: '步骤4: 切换到 battlePrep 界面' },
  { id: 5, name: '步骤5: renderBattlePrep 计算敌人数量' },
  { id: 6, name: '步骤6: 生成敌人团队' },
  { id: 7, name: '步骤7: 渲染 BattlePrepScreen' },
  { id: 8, name: '步骤8: 等待用户点击开始战斗' },
];

interface DebugOverlayProps {
  visible: boolean;
  onClose: () => void;
  steps?: DebugStep[];
  currentStepId?: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  visible,
  onClose,
  steps = [],
  currentStepId = 0,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>🔍 调试模式</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 步骤列表 */}
          <View style={styles.stepsContainer}>
            {DEBUG_STEPS.map((step) => {
              const debugStep = steps.find(s => s.id === step.id);
              const status = debugStep?.status || 'pending';
              const message = debugStep?.message || '';
              const data = debugStep?.data;
              
              // 当前步骤高亮
              const isCurrent = step.id === currentStepId;
              
              return (
                <View
                  key={step.id}
                  style={[
                    styles.stepItem,
                    isCurrent && styles.currentStep,
                    status === 'completed' && styles.completedStep,
                    status === 'error' && styles.errorStep,
                    status === 'running' && styles.runningStep,
                  ]}
                >
                  {/* 步骤状态图标 */}
                  <Text style={styles.stepIcon}>
                    {status === 'completed' ? '✅' :
                     status === 'error' ? '❌' :
                     status === 'running' ? '🔄' : '⏳'}
                  </Text>
                  
                  {/* 步骤名称和消息 */}
                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepName,
                      isCurrent && styles.currentStepText,
                    ]}>
                      {step.name}
                    </Text>
                    
                    {message ? (
                      <Text style={styles.stepMessage}>{message}</Text>
                    ) : null}
                    
                    {/* 显示关键数据 */}
                    {data ? (
                      <Text style={styles.stepData}>
                        {JSON.stringify(data)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.bottomButton} onPress={onClose}>
            <Text style={styles.bottomButtonText}>关闭调试</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// 调试工具 Hook
export const useDebug = () => {
  const [debugState, setDebugState] = useState<DebugState>({
    enabled: false,
    steps: DEBUG_STEPS.map(s => ({ ...s, status: 'pending' })),
    currentStepId: 0,
  });

  // 开始调试
  const startDebug = () => {
    setDebugState({
      enabled: true,
      steps: DEBUG_STEPS.map(s => ({ ...s, status: 'pending', message: '' })),
      currentStepId: 0,
    });
  };

  // 更新步骤状态
  const updateStep = (stepId: number, status: 'running' | 'completed' | 'error', message?: string, data?: any) => {
    setDebugState(prev => ({
      ...prev,
      currentStepId: status === 'running' ? stepId : prev.currentStepId,
      steps: prev.steps.map(s =>
        s.id === stepId
          ? { ...s, status, message: message || '', data, timestamp: Date.now() }
          : s
      ),
    }));
  };

  // 等待指定时间
  const wait = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // 结束调试
  const endDebug = () => {
    setDebugState(prev => ({ ...prev, enabled: false }));
  };

  return {
    debugState,
    startDebug,
    updateStep,
    wait,
    endDebug,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 24,
    padding: 5,
  },
  stepsContainer: {
    maxHeight: 400,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#2a2a4a',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#555',
  },
  currentStep: {
    backgroundColor: '#3a3a5a',
    borderLeftColor: '#ffeb3b',
  },
  completedStep: {
    borderLeftColor: '#4ade80',
  },
  errorStep: {
    borderLeftColor: '#e94560',
  },
  runningStep: {
    borderLeftColor: '#ffeb3b',
  },
  stepIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentStepText: {
    color: '#ffeb3b',
  },
  stepMessage: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  stepData: {
    color: '#4ade80',
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  bottomButton: {
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DebugOverlay;
