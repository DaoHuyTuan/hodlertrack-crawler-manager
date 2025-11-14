import Docker from 'dockerode'
import {
  CRAWLER_IMAGE,
  NETWORK_NAME,
  SERVER_WEBSOCKET_URL,
  TOKEN_ADDRESS,
  TOKEN_ID,
  TOKEN_NAME,
  TOKEN_SYMBOL
} from '../utils/variable'

export interface DockerConfig {
  network_name?: string
  crawler_image?: string
  crawler_image_version?: string
  address?: string
  token_symbol?: string
  token_name?: string
  token_id?: string
  server_websocket_url?: string
}

interface GetConfigVariableParams {
  variable: string
  config: DockerConfig
  default_value: string
}

export class DockerService {
  private docker_client: Docker
  private network_name: string
  private crawler_image: string
  private default_ws_url: string
  private token_id: string
  private token_address: string
  private token_name: string
  private token_symbol: string

  constructor(config: DockerConfig) {
    this.docker_client = new Docker({ socketPath: '/var/run/docker.sock' })
    this.network_name = this.get_config_variable({
      variable: NETWORK_NAME,
      config: config,
      default_value: 'hodler-network'
    })
    this.crawler_image = this.get_config_variable({
      variable: CRAWLER_IMAGE,
      config: config,
      default_value: 'hodlertrack-crawler:latest'
    })
    this.default_ws_url = this.get_config_variable({
      variable: SERVER_WEBSOCKET_URL,
      config: config,
      default_value: 'ws://localhost:3000'
    })
    this.token_id = this.get_config_variable({
      variable: TOKEN_ID,
      config: config,
      default_value: ''
    })
    this.token_address = this.get_config_variable({
      variable: TOKEN_ADDRESS,
      config: config,
      default_value: ''
    })
    this.token_name = this.get_config_variable({
      variable: TOKEN_NAME,
      config: config,
      default_value: ''
    })
    this.token_symbol = this.get_config_variable({
      variable: TOKEN_SYMBOL,
      config: config,
      default_value: ''
    })
  }

  private get_config_variable = (params: GetConfigVariableParams): string => {
    // Only allow string keys known on DockerConfig using 'keyof'
    const variable = params.variable as keyof DockerConfig
    const value = params.config[variable]
    if (typeof value === 'string' && value.length) {
      return value
    }
    const envValue = process.env[params.variable]
    if (typeof envValue === 'string' && envValue.length) {
      return envValue
    }
    return params.default_value as string
  }

  private get_network = async (): Promise<Docker.Network> => {
    try {
      const networks = await this.docker_client.listNetworks()
      const network = networks.find(
        network => network.Name === this.network_name
      )
      if (!network) {
        throw new Error(`Network ${this.network_name} not found`)
      }
      return network as unknown as Docker.Network
    } catch (error) {
      console.log('error', error)
      throw new Error(`Failed to get network ${this.network_name}: ${error}`)
    }
  }

  public clone_crawler = async () => {
    try {
      const network = await this.get_network()
      if (!network) {
        throw new Error(`Network ${this.network_name} not found`)
      }
      const container = this.docker_client.createContainer({
        Image: this.crawler_image,
        name: `hodler-crawler-${this.token_symbol}-${this.token_address}`,
        ExposedPorts: {
          '80/tcp': {} // Expose port 80 của container
        },
        HostConfig: {
          PortBindings: {
            '80/tcp': [{}] // Không chỉ định host port, Docker sẽ tự chọn port trống
          },
          PublishAllPorts: true // Đảm bảo tất cả exposed ports được publish
        },
        Env: [
          `NETWORK_NAME=${this.network_name}`,
          `CRAWLER_IMAGE=${this.crawler_image}`,
          `SERVER_WEBSOCKET_URL=${this.default_ws_url}`
        ]
      })
      return container
    } catch (error) {
      console.log('error', error)
      throw new Error(`Failed to clone crawler: ${error}`)
    }
  }
}
