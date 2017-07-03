variable "blockchainDir" {
  default = "~/.lamassu/blockchains"
}

data "template_file" "tunnel_conf" {
  template = "${file("./blockchains/tunnel.conf")}"

  vars {
    blockchain = "zcash"
    ipv4_address = "${digitalocean_droplet.zcashd.ipv4_address}"
    port = "8232"
  }
}

resource "digitalocean_ssh_key" "default" {
  name       = "Terraform Example"
  public_key = "${file("./scratch/server-test.pub")}"
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
    private_key = "${file("./server-test")}"
  }

  provisioner "file" {
    source      = "./blockchains/zcashd/supervisor-zcash.conf"
    destination = "/tmp/supervisor-zcash.conf"
  }

  provisioner "file" {
    source      = "${var.blockchainDir}/zcash.conf"
    destination = "/tmp/zcash.conf"
  }

  provisioner "local-exec" {
    command = "./local-pre-install"
  }

  provisioner "remote-exec" {
    script  = "./blockchains/zcashd/install.sh"
  }

  provisioner "local-exec" {
    command = "echo ${template_file.tunnel_conf.rendered} > /etc/supervisor/zcash-tunnel.conf"
  }
}
