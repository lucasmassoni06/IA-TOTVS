import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626' }}>Algo deu errado</h2>
          <pre style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '12px' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}