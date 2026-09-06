import { ApiOutlined, RobotOutlined } from '@ant-design/icons';
import type { Model } from '../types';
import { modelIconName } from '../utils/modelIcons';

export function ModelProviderIcon({ modelName, size = 16 }: { modelName: string; size?: number }) {
  const Icon = modelName.toLowerCase().includes('claude') ? RobotOutlined : ApiOutlined;
  return <Icon style={{ fontSize: size }} />;
}

export function ModelOptionLabel({ model }: { model: Model }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ModelProviderIcon modelName={modelIconName(model)} />
      <span>{model.label}</span>
    </span>
  );
}
