/* eslint-disable comma-dangle */
/* eslint-disable no-undef */
const { expect } = require('chai');

describe('Testament', function () {
  let dev, owner, doctor, doctor2, heir1, heir2, Testament, testament;
  const SEND_AMOUNT = 1000;

  beforeEach(async function () {
    [dev, owner, doctor, doctor2, heir1, heir2] = await ethers.getSigners();
    Testament = await ethers.getContractFactory('Testament');
    testament = await Testament.connect(dev).deploy(owner.address, doctor.address);
    await testament.deployed();
  });
  describe('Deployment', function () {
    it('Should set owner', async function () {
      expect(await testament.owner()).to.equal(owner.address);
    });
    it('Should set doctor', async function () {
      expect(await testament.doctor()).to.equal(doctor.address);
    });
    it('Owner should be alive', async function () {
      expect(await testament.alive()).to.be.true;
    });
    it('Contract should have 0 currency', async function () {
      expect(await testament.total()).to.equal(0);
    });
    it('Should revert if owner and doctor share the same address', async function () {
      await expect(Testament.connect(dev).deploy(owner.address, owner.address)).to.be.revertedWith(
        'Testament: Owner cannot be his own doctor'
      );
    });
  });
  describe('Doctor change', function () {
    it('Should change doctor', async function () {
      await testament.connect(owner).setDoctor(doctor2.address);
      expect(await testament.doctor()).to.equal(doctor2.address);
    });
    it('Should emit a DoctorChanged event', async function () {
      expect(await testament.connect(owner).setDoctor(doctor2.address))
        .to.emit(testament, 'DoctorChanged')
        .withArgs(doctor2.address);
    });
    it('Should revert if owner want to be his own doctor', async function () {
      await expect(testament.connect(owner).setDoctor(owner.address)).to.be.revertedWith(
        'Testament: You cannot be your own doctor'
      );
    });
    it('Should revert if not owner', async function () {
      await expect(testament.connect(heir1).setDoctor(heir2.address)).to.be.revertedWith(
        'Testament: Your are not the owner of this contract'
      );
    });
    it('Should revert if owner is dead', async function () {
      await testament.connect(doctor).passAway();
      await expect(testament.connect(owner).setDoctor(doctor2.address)).to.be.revertedWith(
        'Testament: Sorry you are dead, probably'
      );
    });
  });
  describe('Pass away', function () {
    it('Should change alive to false', async function () {
      await testament.connect(doctor).passAway();
      expect(await testament.alive()).to.be.false;
    });
    it('Should emit a Died event', async function () {
      expect(await testament.connect(doctor).passAway())
        .to.emit(testament, 'Died')
        .withArgs(doctor.address, owner.address);
    });
    it('Should revert if not doctor', async function () {
      await expect(testament.connect(heir1).passAway()).to.be.revertedWith(
        'Testament: you are not the doctor of this contract'
      );
    });
    it('Owner cannot be resurected', async function () {
      await testament.connect(doctor).passAway();
      await expect(testament.connect(doctor).passAway()).to.be.revertedWith('Testament: The owner is already dead');
    });
  });
  describe('Bequeath', function () {
    let currentBalance;
    beforeEach(async function () {
      currentBalance = await owner.getBalance();
    });
    it('Should add currency to beneficiary account', async function () {
      await testament.connect(owner).bequeath(heir1.address, { gasPrice: 0, value: SEND_AMOUNT });
      expect(await testament.benefactorOf(heir1.address)).to.equal(SEND_AMOUNT);
      expect(await owner.getBalance()).to.equal(currentBalance.sub(SEND_AMOUNT));
    });
    it('Should emit a Bequeathed event', async function () {
      expect(await testament.connect(owner).bequeath(heir1.address, { value: SEND_AMOUNT }))
        .to.emit(testament, 'Bequeathed')
        .withArgs(heir1.address, SEND_AMOUNT);
    });
    it('Should revert it not owner', async function () {
      await expect(testament.connect(heir1).bequeath(heir2.address, { value: SEND_AMOUNT })).to.be.revertedWith(
        'Testament: Your are not the owner of this contract'
      );
    });
    it('Should revert if owner is dead', async function () {
      await testament.connect(doctor).passAway();
      await expect(testament.connect(owner).bequeath(heir1.address, { value: SEND_AMOUNT })).to.be.revertedWith(
        'Testament: Sorry you are dead, probably'
      );
    });
    it('Should revert if send to zero address', async function () {
      await expect(
        testament.connect(owner).bequeath(ethers.constants.AddressZero, { value: SEND_AMOUNT })
      ).to.be.revertedWith('Testament: transfer to the zero address');
    });
  });
  describe('Quote Share', function () {
    let currentBalance;
    beforeEach(async function () {
      currentBalance = await heir2.getBalance();
      await testament.connect(owner).bequeath(heir2.address, { value: SEND_AMOUNT });
      await testament.connect(doctor).passAway();
    });
    it('Should receive his bequeath', async function () {
      await testament.connect(heir2).quoteShare({ gasPrice: 0 });
      expect(await heir2.getBalance()).to.equal(currentBalance.add(SEND_AMOUNT));
    });
    it('Should emit a Withdrew event', async function () {
      expect(await testament.connect(heir2).quoteShare({ gasPrice: 0 }))
        .to.emit(testament, 'Withdrew')
        .withArgs(heir2.address, SEND_AMOUNT);
    });
    it('Should revert if not on the beneficiary list', async function () {
      await expect(testament.connect(heir1).quoteShare()).to.be.revertedWith(
        'Testament: Sorry there is nothing for you'
      );
    });
    it('Should revert if owner is still alive', async function () {
      testament = await Testament.connect(dev).deploy(owner.address, doctor.address);
      await testament.deployed();
      await testament.connect(owner).bequeath(heir2.address, { value: SEND_AMOUNT });
      await expect(testament.connect(heir2).quoteShare()).to.be.revertedWith(
        'Testament: the owner is still alive, be patient'
      );
    });
  });
});
