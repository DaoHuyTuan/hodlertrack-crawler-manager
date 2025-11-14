import { DockerConfig, DockerService } from '../services/docker-service'

export const create_crawler_event = async (data: DockerConfig) => {
  try {
    const docker = new DockerService(data)
    const container = await docker.clone_crawler()
    await container.start()
  } catch (error) {
    console.log('create_crawler_event', error)
  }
}

export const welcome_event = () => {}
