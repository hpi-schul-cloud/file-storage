import { ConfigProperty, Configuration } from '@infra/configuration';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { Algorithm } from 'jsonwebtoken';

export const AUTH_GUARD_CONFIG_TOKEN = 'AUTH_GUARD_CONFIG_TOKEN';

@Configuration()
export class AuthGuardConfig {
	@IsString()
	@Transform(({ value }) => value.replace(/\\n/g, '\n'))
	@ConfigProperty('JWT_PUBLIC_KEY')
	jwtPublicKey =
		'-----BEGIN RSA PUBLIC KEY-----\nMIICCgKCAgEA0/oW2sIZWvVt0AEgQ8PS80/udJzfWXu6t2QWjUcQA2THGvDSXXMH\n6YMMY2czyBgf6L7hHV/9p1Trfpe7YgxYhOoGsxhXG1keAYQ4+mdveaUAa3uiACdE\nodsB0OFjVUdgOHCyUIXFfhSsp2p2tmZeFi/bE2v/05kYO+ExgQuzUDbB8bCr1sc7\ngMS/2dC2iE/BVw/I0F14oZkZn0fshojg4qoaLbLVKB7Iw53IXF2878zXp81Jdnnv\nHdwVbGWqoII6sHZFQs8ob5S/WGMl4QnBHN98x0KmORUFyTv5kK4cdcC8LJ1HpoVW\nNC6js84iF9yFRhYXY2RHqh7BwaZZ4XZym/MetTdQTBDaSvhXe0A3WdahNG+DGrie\nhd6doWk98Adb49InaodH64ZRkurxiX61GEtzjMRq9EfGS5R/IfcWyPQbiir6ymKX\nfOUtywRjcm3FZzmT7j3c0UHzQVEH0NBfTMj+QKz5NILNP230j0DcjNImDbHHcVH1\nquSb6e0WXjKANTkf4gaTOw7jdQDFw0Ou3aEmwPg+Xk1cwCwSHOOmPSSssZwgjpzG\nodPO3vsMGfRYTwcGbzgdQFFj0qTmvgnM5MHtEy8qCyvM4OsAPnE0zQWn48p7PVdJ\nm6j0H/1BYgVw1KxecIVk/HryoTOkgS9lhLu8iEIyrpAlWascIK7Uw58CAwEAAQ==\n-----END RSA PUBLIC KEY-----\n';

	@IsString()
	@ConfigProperty('JWT_SIGNING_ALGORITHM')
	jwtSigningAlgorithm: Algorithm = 'RS256';

	@IsString()
	@ConfigProperty('JWT_DOMAIN')
	jwtDomain = 'localhost';
}
