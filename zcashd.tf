variable "blockchainDir" {
  default = "~/.lamassu/blockchains"
}

resource "digitalocean_ssh_key" "default" {
  name       = "Lamassu Server"
  public_key = "${file("~/.ssh/id_rsa.pub")}"
}

resource "digitalocean_droplet" "zcashd" {
  image  = "debian-9-x64"
  name   = "zcashd-test"
  region = "ams2"
  size   = "2gb"
  ssh_keys = ["${digitalocean_ssh_key.default.id}"]

  connection {
    type     = "ssh"
    user     = "root"
    private_key = "${file("~/.ssh/id_rsa")}"
  }

  provisioner "file" {
    source      = "./blockchains/zcashd/supervisor-zcash.conf"
    destination = "/tmp/supervisor-zcash.conf"
  }

  provisioner "file" {
    source      = "${var.blockchainDir}/zcash.conf"
    destination = "/tmp/zcash.conf"
  }

  provisioner "remote-exec" {
    script  = "./blockchains/zcashd/install.sh"
  }
}

output "ip_address" {
  value = "${digitalocean_droplet.zcashd.ipv4_address}"
}

