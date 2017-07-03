module "zcash" {
  source = "./blockchain"
  name = "zcash"
  blockchain_cmd = "zcashd"
  blockchain_conf = "zcash.conf"
  ssh_key = "${digitalocean_ssh_key.default.id}"
}

module "bitcoin" {
  source = "./blockchain"
  name = "bitcoin"
  blockchain_cmd = "bitcoind"
  blockchain_conf = "bitcoin.conf"
  ssh_key = "${digitalocean_ssh_key.default.id}"
}

resource "digitalocean_ssh_key" "default" {
  name       = "Lamassu Server"
  public_key = "${file("~/.ssh/id_rsa.pub")}"
}

