import { Injectable } from '@nestjs/common';
import * as packageJson from '../package.json';

const BUILD_TIME = new Date().toLocaleString()

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getVersion(): string {
    return packageJson.version;
  }

  getDate(): string {
    return BUILD_TIME;
  }
}
