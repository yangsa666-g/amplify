import React from 'react';
import { Alert, Button } from 'antd';
import i18n from '../i18n';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <Alert
            type="error"
            message={i18n.t('common.somethingWrong')}
            description={this.state.error.message}
            showIcon
            action={
              <Button size="small" onClick={() => this.setState({ error: null })}>
                {i18n.t('common.dismiss')}
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
