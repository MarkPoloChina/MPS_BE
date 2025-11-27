import { Injectable } from '@nestjs/common';
import * as packageJson from '../package.json';
import { BUILD_TIME } from '../build-info';

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
