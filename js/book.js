/* Topic and section map, following "Conquering the Physics GRE" (Kahn & Anderson, 2nd ed.).
 * Chapter 5 (QM and AMO) is split into the two GRE content areas it covers:
 * Quantum Mechanics (§5.1–5.6) and Atomic Physics (§5.7).
 * `weight` is the percentage of the real exam devoted to the topic (ETS content outline).
 */
(function (GRE) {
  'use strict';
  const S = (id, name, subs) => ({ id, name, subs: (subs || [[id, name]]).map(([sid, sname]) => ({ id: sid, name: sname })) });

  GRE.defineTopic({
    id: 'mech', name: 'Classical Mechanics', short: 'Mechanics', chapter: '1', weight: 20, color: '#2f6fde',
    sections: [
      S('1.1', 'Block problems', [['1.1.1', 'Blocks on ramps'], ['1.1.2', 'Falling and hanging blocks'], ['1.1.3', 'Blocks in contact']]),
      S('1.2', 'Kinematics', [['1.2', 'Projectiles and reference frames'], ['1.2.1', 'Circular motion']]),
      S('1.3', 'Energy', [['1.3.1', 'Types of energy'], ['1.3.2', 'Kinetic/potential problems'], ['1.3.3', 'Rolling without slipping'], ['1.3.4', 'Work-energy theorem']]),
      S('1.4', 'Momentum', [['1.4.1', 'Linear collisions'], ['1.4.2', 'Rotational motion and angular momentum'], ['1.4.3', 'Moment of inertia'], ['1.4.4', 'Center of mass']]),
      S('1.5', 'Lagrangians and Hamiltonians', [['1.5.1', 'Lagrangians'], ['1.5.2', 'Euler–Lagrange equations'], ['1.5.3', 'Hamiltonians and Hamilton’s equations']]),
      S('1.6', 'Orbits', [['1.6.1', 'Effective potential'], ['1.6.2', 'Classification of orbits'], ['1.6.3', 'Kepler’s laws']]),
      S('1.7', 'Springs', [['1.7.1', 'Normal modes'], ['1.7.2', 'Damping, driving, and resonance'], ['1.7.3', 'Further examples (pendula, springs in combination)']]),
      S('1.8', 'Fluid mechanics', [['1.8.1', 'Bernoulli’s principle'], ['1.8.2', 'Buoyant forces']]),
    ],
  });

  GRE.defineTopic({
    id: 'em', name: 'Electromagnetism', short: 'E&M', chapter: '2', weight: 18, color: '#d9480f',
    sections: [
      S('2.1', 'Electrostatics', [['2.1.1', 'Maxwell’s equations for electrostatics'], ['2.1.2', 'Electric potential'], ['2.1.3', 'Integral form (Gauss’s law)'], ['2.1.4', 'Standard electrostatics configurations'], ['2.1.5', 'Boundary conditions'], ['2.1.6', 'Conductors'], ['2.1.7', 'Method of images'], ['2.1.8', 'Work and energy in electrostatics'], ['2.1.9', 'Capacitors']]),
      S('2.2', 'Magnetostatics', [['2.2.1', 'Basic tools (Lorentz force)'], ['2.2.2', 'Ampère’s law and Biot–Savart'], ['2.2.3', 'Standard magnetostatics configurations'], ['2.2.4', 'Boundary conditions'], ['2.2.5', 'Work and energy in magnetostatics'], ['2.2.6', 'Cyclotron motion']]),
      S('2.3', 'Electrodynamics', [['2.3.1', 'Maxwell’s equations'], ['2.3.2', 'Faraday’s law'], ['2.3.3', 'Inductors']]),
      S('2.4', 'Dipoles', [['2.4.1', 'Electric dipoles'], ['2.4.2', 'Magnetic dipoles'], ['2.4.3', 'Multipole expansion']]),
      S('2.5', 'Matter effects', [['2.5.1', 'Dielectrics']]),
      S('2.6', 'Electromagnetic waves', [['2.6.1', 'Wave equation and Poynting vector'], ['2.6.2', 'Radiation']]),
      S('2.7', 'Circuits', [['2.7.1', 'Basic elements'], ['2.7.2', 'Kirchhoff’s rules'], ['2.7.3', 'Energy in circuits'], ['2.7.4', 'Standard circuit types (RC, RL, LC, RLC)']]),
    ],
  });

  GRE.defineTopic({
    id: 'optics', name: 'Optics and Wave Phenomena', short: 'Optics & Waves', chapter: '3', weight: 8, color: '#0c8599',
    sections: [
      S('3.1', 'Properties of waves', [['3.1.1', 'Wave equation'], ['3.1.2', 'Nomenclature and complex notation'], ['3.1.3', 'Dispersion relations'], ['3.1.4', 'Examples of waves'], ['3.1.5', 'Index of refraction'], ['3.1.6', 'Polarization']]),
      S('3.2', 'Interference and diffraction', [['3.2.1', 'Double-slit interference'], ['3.2.2', 'Single-slit diffraction'], ['3.2.3', 'Optical path length'], ['3.2.4', 'Thin films and phase shifts'], ['3.2.5', 'Miscellaneous diffraction (gratings, resolution)']]),
      S('3.3', 'Geometric optics', [['3.3.1', 'Reflection and refraction'], ['3.3.2', 'Lenses and mirrors']]),
      S('3.4', 'Assorted extra topics', [['3.4.1', 'Rayleigh scattering'], ['3.4.2', 'Doppler effect'], ['3.4.3', 'Standing sound waves']]),
    ],
  });

  GRE.defineTopic({
    id: 'thermo', name: 'Thermodynamics and Statistical Mechanics', short: 'Thermo & Stat Mech', chapter: '4', weight: 10, color: '#c2255c',
    sections: [
      S('4.1', 'Basic statistical mechanics', [['4.1.1', 'Ensembles and the partition function'], ['4.1.2', 'Entropy'], ['4.1.3', 'Classical limit'], ['4.1.4', 'Equipartition theorem'], ['4.1.5', 'Some mathematical facts']]),
      S('4.2', 'Thermodynamics', [['4.2.1', 'Three laws'], ['4.2.2', 'Gases and equations of state'], ['4.2.3', 'Types of processes'], ['4.2.4', 'Relations between thermodynamic variables'], ['4.2.5', 'Heat capacity'], ['4.2.6', 'Model systems (engines, paramagnets, …)']]),
      S('4.3', 'Quantum statistical mechanics'),
    ],
  });

  GRE.defineTopic({
    id: 'qm', name: 'Quantum Mechanics', short: 'Quantum', chapter: '5.1–5.6', weight: 13, color: '#7048e8',
    sections: [
      S('5.1', 'Formalism', [['5.1.1', 'Wavefunctions and operators'], ['5.1.2', 'Dirac notation'], ['5.1.3', 'Schrödinger equation'], ['5.1.4', 'Commutators and the uncertainty principle']]),
      S('5.2', 'Harmonic oscillator', [['5.2.1', 'One dimension'], ['5.2.2', 'Three dimensions']]),
      S('5.3', 'Other standard Hamiltonians', [['5.3.1', 'Infinite square well'], ['5.3.2', 'Free particle'], ['5.3.3', 'Delta-function potential'], ['5.3.4', 'Finite square well'], ['5.3.5', 'Scattering: reflection and transmission']]),
      S('5.4', 'Three dimensions', [['5.4.1', 'Radial equation and effective potential'], ['5.4.2', 'Angular momentum and spherical harmonics'], ['5.4.3', 'The hydrogen atom']]),
      S('5.5', 'Spin', [['5.5.1', 'Spin-1/2'], ['5.5.2', 'Spin and the wavefunction'], ['5.5.3', 'Adding spins'], ['5.5.4', 'Bosons and fermions']]),
      S('5.6', 'Approximation methods', [['5.6.1', 'Time-independent perturbation theory'], ['5.6.2', 'Variational principle'], ['5.6.3', 'Adiabatic theorem']]),
    ],
  });

  GRE.defineTopic({
    id: 'atomic', name: 'Atomic Physics', short: 'Atomic', chapter: '5.7', weight: 10, color: '#2b8a3e',
    sections: [
      S('5.7', 'Atomic physics topics', [['5.7.1', 'Bohr model'], ['5.7.2', 'Perturbations to hydrogenic atoms'], ['5.7.3', 'Shell model and electronic notation'], ['5.7.4', 'Stark and Zeeman effects'], ['5.7.5', 'Selection rules'], ['5.7.6', 'Black-body radiation']]),
    ],
  });

  GRE.defineTopic({
    id: 'sr', name: 'Special Relativity', short: 'Relativity', chapter: '6', weight: 6, color: '#e67700',
    sections: [
      S('6.1', 'Relativity 101', [['6.1.1', 'Simultaneity'], ['6.1.2', 'Time dilation'], ['6.1.3', 'Lorentz contraction'], ['6.1.4', 'Velocity addition']]),
      S('6.2', '4-vectors', [['6.2.1', 'Lorentz transformation matrices'], ['6.2.2', 'Relativistic dot product']]),
      S('6.3', 'Relativistic kinematics', [['6.3.1', 'Conserved vs. invariant'], ['6.3.2', 'Exploiting the invariant dot product']]),
      S('6.4', 'Miscellaneous', [['6.4.1', 'Relativistic Doppler shift'], ['6.4.2', 'Pythagorean triples']]),
    ],
  });

  GRE.defineTopic({
    id: 'lab', name: 'Laboratory Methods', short: 'Lab Methods', chapter: '7', weight: 6, color: '#5c940d',
    sections: [
      S('7.1', 'Graph reading', [['7.1.1', 'Dimensional analysis'], ['7.1.2', 'Log plots']]),
      S('7.2', 'Statistics', [['7.2.1', 'Error analysis'], ['7.2.2', 'Poisson processes']]),
      S('7.3', 'Electronics', [['7.3.1', 'AC behavior of basic circuit elements'], ['7.3.2', 'More advanced circuit elements'], ['7.3.3', 'Logic gates']]),
      S('7.4', 'Radiation detection and instrumentation', [['7.4.1', 'Interaction of charged particles with matter'], ['7.4.2', 'Photon interactions'], ['7.4.3', 'General properties of particle detectors'], ['7.4.4', 'Radioactive decays']]),
      S('7.5', 'Lasers and interferometers', [['7.5.1', 'Generic laser operation'], ['7.5.2', 'Types of lasers'], ['7.5.3', 'Interferometers']]),
    ],
  });

  GRE.defineTopic({
    id: 'spec', name: 'Specialized Topics', short: 'Specialized', chapter: '8', weight: 9, color: '#862e9c',
    sections: [
      S('8.1', 'Nuclear and particle physics', [['8.1.1', 'The Standard Model: particles and interactions'], ['8.1.2', 'Nuclear physics: bound states'], ['8.1.3', 'Symmetries and conservation laws'], ['8.1.4', 'Recent developments']]),
      S('8.2', 'Condensed matter physics', [['8.2.1', 'Crystal structure'], ['8.2.2', 'Electron theory of metals'], ['8.2.3', 'Semiconductors'], ['8.2.4', 'Superconductors']]),
      S('8.3', 'Astrophysics'),
      S('8.4', 'Recent Nobel prizes'),
    ],
  });
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
