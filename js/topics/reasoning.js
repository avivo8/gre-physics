/* Original reasoning questions, informed by the ETS content outline and public
 * practice-book formats, not copied from ETS. Fixed stems are counted once;
 * answer shuffles do not inflate the advertised question count. */
(function (GRE) {
  'use strict';
  const items = [
  {
    "topic": "mech",
    "id": "reason-mech-01",
    "sec": "1.1.1",
    "skill": "concept",
    "q": "A block remains at rest on a rough incline. The angle is increased slightly, but the block still does not move. What happens to the magnitude of static friction?",
    "correct": "It increases.",
    "wrongs": [
      "It decreases.",
      "It stays at its maximum value.",
      "It becomes zero.",
      "It becomes equal to the normal force."
    ],
    "expl": "Force balance along the slope requires $f_s=mg\\sin\\theta$. Static friction adjusts to the required value; it is not always $\\mu_s N$."
  },
  {
    "topic": "mech",
    "id": "reason-mech-02",
    "sec": "1.2",
    "skill": "concept",
    "q": "A ball is thrown vertically upward. Neglect air resistance. At its highest point, which statement is correct?",
    "correct": "Its velocity is zero and its acceleration is downward.",
    "wrongs": [
      "Both velocity and acceleration are zero.",
      "Its velocity is upward and acceleration is zero.",
      "Its acceleration changes from upward to downward.",
      "Its acceleration depends on the launch speed."
    ],
    "expl": "Gravity acts throughout the flight. A zero instantaneous velocity does not imply zero acceleration."
  },
  {
    "topic": "mech",
    "id": "reason-mech-03",
    "sec": "1.2.1",
    "skill": "concept",
    "q": "A particle moves at constant speed around a circle. Which pair of quantities changes continuously?",
    "correct": "Velocity and acceleration vectors",
    "wrongs": [
      "Speed and kinetic energy",
      "Speed and angular speed",
      "Kinetic energy and momentum magnitude",
      "Angular speed and kinetic energy"
    ],
    "expl": "Both vectors rotate even though their magnitudes remain constant. Centripetal acceleration changes direction, not speed."
  },
  {
    "topic": "mech",
    "id": "reason-mech-04",
    "sec": "1.3.2",
    "skill": "graph",
    "q": "A one-dimensional potential-energy curve has a smooth local minimum at $x=a$. What is true at that point?",
    "correct": "The force is zero and the equilibrium is stable.",
    "wrongs": [
      "The force is zero and the equilibrium is unstable.",
      "The force points right and equilibrium is stable.",
      "The force points left and equilibrium is unstable.",
      "The kinetic energy must be zero."
    ],
    "expl": "$F=-dU/dx$ vanishes at the minimum. A small displacement produces a restoring force; the particle need not be at rest there.",
    "fig": "<svg viewBox=\"0 0 320 180\" width=\"320\" role=\"img\" aria-label=\"Potential energy versus position, with a smooth minimum at x equals a.\" style=\"max-width:100%;height:auto\"><g stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"><path d=\"M40 15V145H300\"/><path d=\"M35 23L40 15L45 23M292 140L300 145L292 150\"/><path d=\"M75 30Q170 245 265 30\"/><path d=\"M170 137V148\"/><text x=\"15\" y=\"20\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">U</text><text x=\"300\" y=\"165\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">x</text><text x=\"166\" y=\"167\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">a</text></g></svg>"
  },
  {
    "topic": "mech",
    "id": "reason-mech-05",
    "sec": "1.3.3",
    "skill": "concept",
    "q": "A rigid wheel rolls without slipping on a stationary horizontal surface. At an instant, what is the velocity of its point of contact relative to the ground?",
    "correct": "Zero",
    "wrongs": [
      "Equal to the center velocity",
      "Twice the center velocity, forward",
      "Twice the center velocity, backward",
      "Vertical and upward"
    ],
    "expl": "At contact, the translational and rotational velocities cancel. The top point, rather than the contact point, moves at twice the center speed."
  },
  {
    "topic": "mech",
    "id": "reason-mech-06",
    "sec": "1.4.1",
    "skill": "concept",
    "q": "Two bodies collide and stick together on a frictionless horizontal track. Which quantity is necessarily conserved for the two-body system during the collision?",
    "correct": "Total linear momentum",
    "wrongs": [
      "Total kinetic energy",
      "The velocity of each body",
      "The momentum of each body separately",
      "Total mechanical energy excluding internal energy"
    ],
    "expl": "There is no external horizontal impulse. Kinetic energy can become internal energy even though total momentum is conserved."
  },
  {
    "topic": "mech",
    "id": "reason-mech-07",
    "sec": "1.4.2",
    "skill": "concept",
    "q": "A spinning skater pulls her arms inward with negligible external torque. Which statement describes the change?",
    "correct": "Angular speed and rotational kinetic energy both increase.",
    "wrongs": [
      "Angular speed increases and kinetic energy stays constant.",
      "Angular speed stays constant and kinetic energy increases.",
      "Both decrease.",
      "Angular momentum increases and kinetic energy decreases."
    ],
    "expl": "Angular momentum stays fixed while moment of inertia decreases. Since $K=L^2/(2I)$, kinetic energy increases; the skater supplies the work."
  },
  {
    "topic": "mech",
    "id": "reason-mech-08",
    "sec": "1.4.4",
    "skill": "concept",
    "q": "A firework traveling through the air explodes. Neglect air resistance. How does its center of mass move immediately after the explosion?",
    "correct": "Along the same gravitational trajectory it would have followed without exploding",
    "wrongs": [
      "Vertically downward from the explosion point",
      "At constant velocity in a straight line",
      "Toward the largest fragment",
      "In the direction of the fastest fragment"
    ],
    "expl": "Internal explosion forces cannot change center-of-mass motion. The external gravitational force still determines its acceleration."
  },
  {
    "topic": "mech",
    "id": "reason-mech-09",
    "sec": "1.6.3",
    "skill": "scaling",
    "q": "Two satellites have circular orbits about the same planet. One orbit has four times the radius of the other. What is the ratio of its period to the smaller orbit's period?",
    "correct": "8",
    "wrongs": [
      "2",
      "4",
      "16",
      "One half"
    ],
    "expl": "Kepler's law gives $T\\propto r^{3/2}$. A factor of four in radius gives $4^{3/2}=8$ in period."
  },
  {
    "topic": "mech",
    "id": "reason-mech-10",
    "sec": "1.7.2",
    "skill": "graph",
    "q": "After a small displacement, an underdamped oscillator is released. Which description fits its displacement versus time?",
    "correct": "Oscillations inside a decaying exponential envelope",
    "wrongs": [
      "A pure exponential decay without crossing equilibrium",
      "Oscillations of constant amplitude",
      "Oscillations whose amplitude grows linearly",
      "A constant displacement after one cycle"
    ],
    "expl": "Underdamping retains oscillations while dissipation reduces their amplitude. A nonoscillatory return corresponds to critical or overdamping."
  },
  {
    "topic": "mech",
    "id": "reason-mech-11",
    "sec": "1.7.3",
    "skill": "scaling",
    "q": "The mass on an ideal horizontal spring is quadrupled while the spring constant stays fixed. How does the oscillation period change?",
    "correct": "It doubles.",
    "wrongs": [
      "It quadruples.",
      "It halves.",
      "It stays unchanged.",
      "It increases by a factor of sixteen."
    ],
    "expl": "$T=2\\pi\\sqrt{m/k}$, so the period scales with the square root of mass. The amplitude does not enter this ideal result."
  },
  {
    "topic": "mech",
    "id": "reason-mech-12",
    "sec": "1.8.2",
    "skill": "concept",
    "q": "An ice cube floats in a glass of water. The ice melts completely without spilling or evaporation. How does the water level change?",
    "correct": "It stays the same.",
    "wrongs": [
      "It rises because liquid water occupies more volume than ice.",
      "It falls because ice is less dense than water.",
      "It rises by the volume initially above water.",
      "It depends on the shape of the ice cube."
    ],
    "expl": "The floating ice initially displaces its own mass of water. Melting produces exactly that volume of liquid water."
  },
  {
    "topic": "em",
    "id": "reason-em-01",
    "sec": "2.1.3",
    "skill": "concept",
    "q": "The net electric flux through a closed surface is zero. What follows necessarily?",
    "correct": "The net enclosed charge is zero.",
    "wrongs": [
      "The electric field is zero everywhere on the surface.",
      "There are no charges inside the surface.",
      "The potential is zero on the surface.",
      "There are no charges outside the surface."
    ],
    "expl": "Gauss's law relates net flux to net enclosed charge. Opposite enclosed charges can cancel, and external charges can produce nonzero fields."
  },
  {
    "topic": "em",
    "id": "reason-em-02",
    "sec": "2.1.6",
    "skill": "concept",
    "q": "A conductor is in electrostatic equilibrium. Which statement must hold inside its conducting material?",
    "correct": "The electric field is zero.",
    "wrongs": [
      "The electric potential is zero.",
      "The electric potential varies linearly with position.",
      "The net surface charge is zero.",
      "The magnetic field is zero."
    ],
    "expl": "Free charges rearrange until the internal electric field vanishes. The constant potential need not equal zero."
  },
  {
    "topic": "em",
    "id": "reason-em-03",
    "sec": "2.1.2",
    "skill": "graph",
    "q": "Along the $x$ axis, electric potential decreases linearly as $x$ increases. What is the electric field along this axis?",
    "correct": "Constant and directed toward positive $x$",
    "wrongs": [
      "Constant and directed toward negative $x$",
      "Zero",
      "Increasing in magnitude toward positive $x$",
      "Decreasing in magnitude toward positive $x$"
    ],
    "expl": "$E_x=-dV/dx$. A constant negative slope gives a constant positive field.",
    "fig": "<svg viewBox=\"0 0 320 180\" width=\"320\" role=\"img\" aria-label=\"Electric potential versus position is a straight line with negative slope.\" style=\"max-width:100%;height:auto\"><g stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"><path d=\"M40 15V145H300\"/><path d=\"M35 23L40 15L45 23M292 140L300 145L292 150\"/><path d=\"M65 35L275 125\"/><text x=\"15\" y=\"20\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">V</text><text x=\"300\" y=\"165\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">x</text></g></svg>"
  },
  {
    "topic": "em",
    "id": "reason-em-04",
    "sec": "2.1.9",
    "skill": "concept",
    "q": "A charged parallel-plate capacitor is disconnected from its battery. A dielectric completely fills the gap. What happens to its charge and voltage?",
    "correct": "Charge stays fixed and voltage decreases.",
    "wrongs": [
      "Charge increases and voltage stays fixed.",
      "Both increase.",
      "Both decrease.",
      "Charge stays fixed and voltage increases."
    ],
    "expl": "Disconnection fixes free charge. The dielectric increases capacitance, so $V=Q/C$ decreases."
  },
  {
    "topic": "em",
    "id": "reason-em-05",
    "sec": "2.2.1",
    "skill": "concept",
    "q": "A charged particle enters a uniform magnetic field perpendicular to its velocity. No other force acts. What does the magnetic force change?",
    "correct": "The direction of momentum, but not kinetic energy",
    "wrongs": [
      "Kinetic energy, but not momentum direction",
      "Both speed and kinetic energy",
      "The magnitude of momentum only",
      "The particle's electric charge"
    ],
    "expl": "The magnetic force is perpendicular to velocity and does no work. The momentum vector turns while its magnitude stays fixed."
  },
  {
    "topic": "em",
    "id": "reason-em-06",
    "sec": "2.2.2",
    "skill": "scaling",
    "q": "Outside a long straight current-carrying wire, the observation distance is tripled while the current stays fixed. What happens to the magnetic field magnitude?",
    "correct": "It becomes one third as large.",
    "wrongs": [
      "It becomes one ninth as large.",
      "It triples.",
      "It stays the same.",
      "It becomes nine times as large."
    ],
    "expl": "Ampere's law gives $B=\\mu_0 I/(2\\pi r)$. The field scales as inverse distance, not inverse distance squared."
  },
  {
    "topic": "em",
    "id": "reason-em-07",
    "sec": "2.3.2",
    "skill": "concept",
    "q": "A magnet's north pole approaches a conducting loop along its axis. What is the direction of the induced magnetic effect on the approaching magnet?",
    "correct": "Repulsive, opposing the approach",
    "wrongs": [
      "Attractive, reinforcing the approach",
      "Zero because the loop has no battery",
      "Repulsive only after the magnet stops",
      "Attractive regardless of the motion direction"
    ],
    "expl": "Lenz's law makes the induced field oppose the increase in magnetic flux. Reversing the motion reverses the induced current."
  },
  {
    "topic": "em",
    "id": "reason-em-08",
    "sec": "2.4.1",
    "skill": "concept",
    "q": "An ideal electric dipole is placed obliquely in a uniform electric field. What are its net force and torque?",
    "correct": "Zero force and nonzero torque",
    "wrongs": [
      "Nonzero force and zero torque",
      "Both zero",
      "Both nonzero, with force parallel to the field",
      "Both nonzero, with force perpendicular to the field"
    ],
    "expl": "Equal and opposite charge forces cancel in a uniform field but form a couple. A field gradient is needed for a net dipole force."
  },
  {
    "topic": "em",
    "id": "reason-em-09",
    "sec": "2.6.1",
    "skill": "concept",
    "q": "A plane electromagnetic wave in vacuum has electric field along positive $x$ and magnetic field along positive $z$ at one instant. In which direction does energy flow?",
    "correct": "Negative $y$",
    "wrongs": [
      "Positive $y$",
      "Positive $x$",
      "Negative $x$",
      "Positive $z$"
    ],
    "expl": "The Poynting vector points along $\\mathbf E\\times\\mathbf B$. The right-hand rule gives $\\hat x\\times\\hat z=-\\hat y$."
  },
  {
    "topic": "em",
    "id": "reason-em-10",
    "sec": "2.7.4",
    "skill": "concept",
    "q": "An initially uncharged capacitor is connected in series with a resistor and a DC battery. Long after connection, the ideal capacitor behaves like what circuit element?",
    "correct": "An open circuit",
    "wrongs": [
      "A short circuit",
      "A resistor equal to the series resistance",
      "A constant-current source",
      "An inductor with increasing current"
    ],
    "expl": "Once the capacitor voltage reaches the battery voltage, charging current vanishes. A capacitor blocks steady DC after the transient."
  },
  {
    "topic": "em",
    "id": "reason-em-11",
    "sec": "2.3.3",
    "skill": "concept",
    "q": "A steady current in an ideal inductor is interrupted by opening a switch. Why can a large voltage appear across the switch?",
    "correct": "The inductor opposes the rapid decrease in current.",
    "wrongs": [
      "The inductor requires its voltage to remain continuous.",
      "The current instantly becomes arbitrarily large.",
      "The magnetic flux must increase.",
      "An ideal inductor stores electric charge on its terminals."
    ],
    "expl": "The induced voltage is proportional to the rate of change of current. Rapid interruption can produce a large voltage; current continuity is the key idea."
  },
  {
    "topic": "em",
    "id": "reason-em-12",
    "sec": "2.7.1",
    "skill": "scaling",
    "q": "Two identical resistors are changed from series to parallel across the same ideal battery. By what factor does total power increase?",
    "correct": "4",
    "wrongs": [
      "2",
      "8",
      "One half",
      "It does not change."
    ],
    "expl": "Equivalent resistance falls from $2R$ to $R/2$. At fixed voltage, $P=V^2/R_{\\rm eq}$ therefore increases fourfold."
  },
  {
    "topic": "optics",
    "id": "reason-optics-01",
    "sec": "3.1.5",
    "skill": "concept",
    "q": "Monochromatic light passes from air into stationary glass. Which quantity remains unchanged?",
    "correct": "Frequency",
    "wrongs": [
      "Wavelength",
      "Phase speed",
      "The angle to the normal for every incident ray",
      "Momentum per photon"
    ],
    "expl": "The source fixes the frequency across a stationary boundary. Speed and wavelength change together through $v=f\\lambda$."
  },
  {
    "topic": "optics",
    "id": "reason-optics-02",
    "sec": "3.1.6",
    "skill": "concept",
    "q": "Unpolarized light passes through two ideal polarizers with perpendicular transmission axes. What is transmitted through both?",
    "correct": "No light",
    "wrongs": [
      "Half the incident intensity",
      "One quarter of the incident intensity",
      "All of the incident intensity",
      "Circularly polarized light of unchanged intensity"
    ],
    "expl": "The first polarizer selects one linear polarization. The second rejects it because the axes are perpendicular."
  },
  {
    "topic": "optics",
    "id": "reason-optics-03",
    "sec": "3.2.1",
    "skill": "scaling",
    "q": "In a far-field double-slit experiment, slit separation is doubled with wavelength and screen distance fixed. What happens to fringe spacing?",
    "correct": "It halves.",
    "wrongs": [
      "It doubles.",
      "It quadruples.",
      "It stays fixed.",
      "It becomes one quarter as large."
    ],
    "expl": "Fringe spacing is $\\lambda L/d$. Increasing slit separation narrows the spacing."
  },
  {
    "topic": "optics",
    "id": "reason-optics-04",
    "sec": "3.2.2",
    "skill": "concept",
    "q": "A single slit is made narrower while wavelength stays fixed. How does its far-field central diffraction maximum change?",
    "correct": "It becomes wider.",
    "wrongs": [
      "It becomes narrower.",
      "Its angular width stays fixed.",
      "It splits into two equal central maxima.",
      "All diffraction disappears."
    ],
    "expl": "The first minimum satisfies $a\\sin\\theta=\\lambda$. A smaller slit width requires a larger diffraction angle."
  },
  {
    "topic": "optics",
    "id": "reason-optics-05",
    "sec": "3.3.1",
    "skill": "concept",
    "q": "Which condition is required for total internal reflection at an interface between transparent media?",
    "correct": "Light is incident from the higher-index medium above the critical angle.",
    "wrongs": [
      "Light is incident from the lower-index medium above the critical angle.",
      "Light is incident normally from either medium.",
      "The two indices are equal.",
      "The transmitted frequency exceeds the incident frequency."
    ],
    "expl": "Snell's law permits no propagating refracted ray when incidence from the higher-index side exceeds the critical angle."
  },
  {
    "topic": "optics",
    "id": "reason-optics-06",
    "sec": "3.3.2",
    "skill": "concept",
    "q": "A real object lies between a converging thin lens and its focal point. What image does the lens form?",
    "correct": "Virtual, upright, and magnified",
    "wrongs": [
      "Real, inverted, and magnified",
      "Virtual, inverted, and reduced",
      "Real, upright, and reduced",
      "Real, inverted, and the same size"
    ],
    "expl": "Inside the focal length the emerging rays diverge. Their backward extensions meet on the object's side, giving an upright enlarged virtual image."
  },
  {
    "topic": "optics",
    "id": "reason-optics-07",
    "sec": "3.4.2",
    "skill": "concept",
    "q": "A stationary listener hears a moving sound source pass by at constant speed. Compared with the frequency just before passing, the frequency just after passing is what?",
    "correct": "Lower",
    "wrongs": [
      "Higher",
      "The same",
      "Zero",
      "Higher only for a louder source"
    ],
    "expl": "An approaching source compresses wavefront spacing; a receding source stretches it. Loudness does not determine the Doppler shift."
  },
  {
    "topic": "optics",
    "id": "reason-optics-08",
    "sec": "3.4.3",
    "skill": "concept",
    "q": "An ideal air column is closed at one end and open at the other. Which harmonics occur among its resonance frequencies?",
    "correct": "Odd harmonics only",
    "wrongs": [
      "Even harmonics only",
      "All integer harmonics",
      "Only the fundamental",
      "All harmonics except the third"
    ],
    "expl": "A displacement node at the closed end and antinode at the open end allow odd multiples of a quarter wavelength."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-01",
    "sec": "4.2.3",
    "skill": "concept",
    "q": "An ideal gas expands freely into vacuum in an insulated container. What happens to its temperature and entropy?",
    "correct": "Temperature stays fixed and entropy increases.",
    "wrongs": [
      "Temperature decreases and entropy stays fixed.",
      "Both stay fixed.",
      "Both increase.",
      "Temperature increases and entropy decreases."
    ],
    "expl": "No heat enters and no external work is done, so internal energy and ideal-gas temperature stay fixed. The irreversible expansion increases entropy."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-02",
    "sec": "4.2.3",
    "skill": "concept",
    "q": "An ideal gas undergoes a slow isothermal expansion while in contact with a heat reservoir. Which statement is correct?",
    "correct": "Heat absorbed equals work done by the gas.",
    "wrongs": [
      "No heat is exchanged.",
      "Internal energy increases by the absorbed heat.",
      "Temperature falls because the gas does work.",
      "Entropy of the gas stays fixed."
    ],
    "expl": "Ideal-gas internal energy depends only on temperature. With $\\Delta U=0$, the first law gives $Q=W$ for work done by the gas."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-03",
    "sec": "4.2.6",
    "skill": "concept",
    "q": "A reversible engine operates between two fixed reservoir temperatures. Which change can increase its efficiency?",
    "correct": "Lowering the cold-reservoir temperature",
    "wrongs": [
      "Increasing the amount of working gas alone",
      "Running the same cycle faster alone",
      "Increasing both heat flows by the same factor",
      "Changing only the units of temperature"
    ],
    "expl": "Carnot efficiency is $1-T_c/T_h$ with absolute temperatures. Amount of gas and overall heat-flow scale do not change this ratio."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-04",
    "sec": "4.2.2",
    "skill": "scaling",
    "q": "For a dilute ideal gas, absolute temperature is increased by a factor of four. What happens to the root-mean-square molecular speed?",
    "correct": "It doubles.",
    "wrongs": [
      "It quadruples.",
      "It increases sixteenfold.",
      "It halves.",
      "It stays fixed."
    ],
    "expl": "Since $v_{\\rm rms}=\\sqrt{3kT/m}$, speed scales with the square root of absolute temperature."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-05",
    "sec": "4.1.4",
    "skill": "concept",
    "q": "At temperatures where rotation is active but vibration is frozen out, what is the molar constant-volume heat capacity of an ideal diatomic gas?",
    "correct": "$5R/2$",
    "wrongs": [
      "$3R/2$",
      "$7R/2$",
      "$R$",
      "$5R$"
    ],
    "expl": "Three translational and two rotational quadratic degrees of freedom each contribute $R/2$. Vibrations contribute only when thermally accessible."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-06",
    "sec": "4.1.1",
    "skill": "concept",
    "q": "A small system exchanges energy but not particles with a large heat bath. Which ensemble describes it?",
    "correct": "Canonical",
    "wrongs": [
      "Microcanonical",
      "Grand canonical",
      "An ensemble with fixed energy and fixed temperature independently",
      "An ensemble with fixed particle chemical potential but freely varying particle number"
    ],
    "expl": "Contact with a heat bath fixes temperature while system energy fluctuates. Fixed particle number distinguishes the canonical from the grand canonical ensemble."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-07",
    "sec": "4.3",
    "skill": "concept",
    "q": "Which occupation restriction applies to identical fermions?",
    "correct": "At most one fermion can occupy a given single-particle quantum state.",
    "wrongs": [
      "Any number can occupy every single-particle state.",
      "All fermions must occupy the ground state.",
      "Only even numbers can occupy a single-particle state.",
      "Fermions must have integer spin."
    ],
    "expl": "The Pauli exclusion principle forbids two identical fermions from occupying the same complete single-particle state, including spin."
  },
  {
    "topic": "thermo",
    "id": "reason-thermo-08",
    "sec": "4.2.3",
    "skill": "graph",
    "q": "A gas completes a clockwise closed loop on a plot with pressure vertical and volume horizontal. What is the net work done by the gas?",
    "correct": "Positive and equal to the enclosed area",
    "wrongs": [
      "Negative and equal in magnitude to the enclosed area",
      "Zero because the gas returns to its initial state",
      "Equal to the change in internal energy",
      "Positive and equal to the perimeter of the loop"
    ],
    "expl": "Work is $\\oint P\\,dV$. Clockwise traversal puts expansion at higher pressure than compression, giving positive enclosed area.",
    "fig": "<svg viewBox=\"0 0 320 180\" width=\"320\" role=\"img\" aria-label=\"Pressure versus volume, with a clockwise rectangular cycle.\" style=\"max-width:100%;height:auto\"><g stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"><path d=\"M40 15V145H300\"/><path d=\"M35 23L40 15L45 23M292 140L300 145L292 150\"/><path d=\"M95 110V50H245V110Z\"/><path d=\"M161 44L171 50L161 56M239 75L245 85L251 75M181 104L171 110L181 116M89 85L95 75L101 85\"/><text x=\"15\" y=\"20\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">P</text><text x=\"300\" y=\"165\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">V</text></g></svg>"
  },
  {
    "topic": "qm",
    "id": "reason-qm-01",
    "sec": "5.1.1",
    "skill": "concept",
    "q": "A system is in a normalized energy eigenstate of a time-independent Hamiltonian. What is true about its position probability density?",
    "correct": "It is independent of time.",
    "wrongs": [
      "It oscillates at the eigenenergy divided by Planck's constant.",
      "It must be uniform in space.",
      "It must be zero outside a single point.",
      "It translates at constant velocity for every potential."
    ],
    "expl": "Time evolution multiplies the state by a global phase. That phase cancels in the squared magnitude of the wavefunction."
  },
  {
    "topic": "qm",
    "id": "reason-qm-02",
    "sec": "5.1.4",
    "skill": "concept",
    "q": "Two observables have noncommuting operators. What follows in general?",
    "correct": "One cannot in general assign simultaneously sharp values to both.",
    "wrongs": [
      "They can never share even a single eigenstate.",
      "Measuring either always gives zero.",
      "Their expectation values must be different.",
      "Their measurement probabilities must be equal."
    ],
    "expl": "Noncommuting observables are not generally simultaneously sharp. Particular shared eigenstates can exist; the uncertainty bound also depends on the state."
  },
  {
    "topic": "qm",
    "id": "reason-qm-03",
    "sec": "5.3.1",
    "skill": "scaling",
    "q": "The width of a one-dimensional infinite square well is doubled with particle mass fixed. What happens to its ground-state energy?",
    "correct": "It becomes one quarter as large.",
    "wrongs": [
      "It halves.",
      "It doubles.",
      "It quadruples.",
      "It stays fixed."
    ],
    "expl": "The energy scale is proportional to $\\hbar^2/(mL^2)$. Doubling length reduces every level energy by a factor of four."
  },
  {
    "topic": "qm",
    "id": "reason-qm-04",
    "sec": "5.3.5",
    "skill": "concept",
    "q": "A particle has energy below a finite rectangular barrier. Its transmitted wave is detected beyond the barrier. Which statement is correct for a static barrier?",
    "correct": "The transmitted particle has the same total energy as the incident particle.",
    "wrongs": [
      "It loses energy equal to the barrier height.",
      "Its total energy becomes equal to the barrier height.",
      "Tunneling violates energy conservation.",
      "Its transmitted energy must be zero."
    ],
    "expl": "Tunneling changes transmission probability, not the conserved energy of a stationary scattering state in a time-independent potential."
  },
  {
    "topic": "qm",
    "id": "reason-qm-05",
    "sec": "5.2.1",
    "skill": "concept",
    "q": "What distinguishes the quantum harmonic oscillator ground state from a classical particle at rest at the potential minimum?",
    "correct": "It has nonzero energy and nonzero position uncertainty.",
    "wrongs": [
      "It has exactly zero kinetic energy.",
      "It has an exact position at the minimum.",
      "It has negative total energy relative to the potential minimum.",
      "It violates the uncertainty principle."
    ],
    "expl": "The zero-point energy is $\\hbar\\omega/2$. Localizing a particle exactly at the minimum is incompatible with finite momentum uncertainty."
  },
  {
    "topic": "qm",
    "id": "reason-qm-06",
    "sec": "5.5.1",
    "skill": "concept",
    "q": "A spin-half particle is prepared with definite positive spin along $z$. A measurement of spin along $x$ gives which probabilities?",
    "correct": "Equal probabilities for the two allowed outcomes",
    "wrongs": [
      "Only the positive outcome",
      "Only the negative outcome",
      "A continuous uniform distribution of spin values",
      "Zero probability for either outcome"
    ],
    "expl": "The positive $z$ spin state is an equal-amplitude superposition of the two $x$ spin eigenstates. Squared amplitudes give equal probabilities."
  },
  {
    "topic": "qm",
    "id": "reason-qm-07",
    "sec": "5.6.1",
    "skill": "concept",
    "q": "A nondegenerate bound state has even parity. A weak perturbing potential is an odd function of position. What is its first-order energy shift?",
    "correct": "Zero",
    "wrongs": [
      "Always positive",
      "Always negative",
      "Equal to the unperturbed energy",
      "Equal to the perturbation strength regardless of the state"
    ],
    "expl": "The first-order shift is the expectation value of the perturbation. The probability density is even, so its product with an odd perturbation integrates to zero over a symmetric domain."
  },
  {
    "topic": "qm",
    "id": "reason-qm-08",
    "sec": "5.6.2",
    "skill": "concept",
    "q": "For a normalized trial state with a finite energy expectation, what does the variational principle guarantee?",
    "correct": "Its energy expectation is at least the true ground-state energy.",
    "wrongs": [
      "Its energy expectation is at most the true ground-state energy.",
      "It equals the first excited-state energy.",
      "It gives the exact ground-state wavefunction.",
      "It has zero energy uncertainty."
    ],
    "expl": "Expanding the trial state in exact energy eigenstates gives a weighted mean of energies, none below the ground-state energy."
  },
  {
    "topic": "qm",
    "id": "reason-qm-09",
    "sec": "5.5.4",
    "skill": "concept",
    "q": "Two identical electrons occupy the same spatial orbital. What must their combined spin state be?",
    "correct": "The antisymmetric spin singlet",
    "wrongs": [
      "Any spin triplet",
      "A symmetric spin singlet",
      "Two parallel spins along every axis",
      "A state with total spin two"
    ],
    "expl": "The common spatial state is symmetric. The total fermion state must be antisymmetric, so the spin state must be the singlet."
  },
  {
    "topic": "qm",
    "id": "reason-qm-10",
    "sec": "5.4.2",
    "skill": "concept",
    "q": "An orbital angular-momentum state has quantum number $l=2$. How many possible outcomes can a measurement of $L_z$ have?",
    "correct": "5",
    "wrongs": [
      "2",
      "3",
      "4",
      "6"
    ],
    "expl": "The magnetic quantum number ranges in integer steps from $-l$ to $+l$, giving $2l+1=5$ outcomes."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-01",
    "sec": "5.7.1",
    "skill": "scaling",
    "q": "For hydrogen-like ions, the nuclear charge is doubled with principal quantum number fixed. Neglect reduced-mass corrections. What happens to the binding-energy magnitude?",
    "correct": "It quadruples.",
    "wrongs": [
      "It doubles.",
      "It halves.",
      "It becomes one quarter as large.",
      "It stays fixed."
    ],
    "expl": "Hydrogenic energy magnitudes scale as $Z^2/n^2$. The nuclear charge enters quadratically."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-02",
    "sec": "5.7.5",
    "skill": "concept",
    "q": "Ignoring spin, which change in orbital quantum numbers is allowed in an electric-dipole atomic transition?",
    "correct": "$\\Delta l=1,\\ \\Delta m=0$",
    "wrongs": [
      "$\\Delta l=0,\\ \\Delta m=0$",
      "$\\Delta l=2,\\ \\Delta m=0$",
      "$\\Delta l=1,\\ \\Delta m=2$",
      "$\\Delta l=0,\\ \\Delta m=1$"
    ],
    "expl": "Electric-dipole transitions require $\\Delta l=\\pm1$ and $\\Delta m=0,\\pm1$. These rules concern dipole radiation, not every possible transition mechanism."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-03",
    "sec": "5.7.6",
    "skill": "scaling",
    "q": "An ideal black body's absolute temperature doubles. What happens to its total emitted power per unit area?",
    "correct": "It increases by a factor of sixteen.",
    "wrongs": [
      "It doubles.",
      "It quadruples.",
      "It increases eightfold.",
      "It stays fixed."
    ],
    "expl": "The Stefan-Boltzmann law gives emitted power per area proportional to $T^4$. Doubling absolute temperature gives sixteen times the power."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-04",
    "sec": "5.7.6",
    "skill": "graph",
    "q": "Two curves show black-body spectral intensity per unit wavelength at different temperatures. Which feature identifies the hotter body?",
    "correct": "Its peak occurs at shorter wavelength and its total area is larger.",
    "wrongs": [
      "Its peak occurs at longer wavelength and its total area is larger.",
      "Its peak wavelength is unchanged and its area is smaller.",
      "Its peak occurs at shorter wavelength and its total area is unchanged.",
      "Its peak occurs at longer wavelength and its total area is smaller."
    ],
    "expl": "Wien's law shifts the wavelength peak toward shorter wavelengths as temperature rises. The integrated spectrum increases according to the Stefan-Boltzmann law."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-05",
    "sec": "5.7.3",
    "skill": "concept",
    "q": "How many electrons can occupy a single spatial atomic orbital?",
    "correct": "2",
    "wrongs": [
      "1",
      "3",
      "4",
      "6"
    ],
    "expl": "A spatial orbital has two possible spin states. Pauli exclusion permits at most one electron in each complete orbital-and-spin state."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-06",
    "sec": "5.7.4",
    "skill": "concept",
    "q": "In the normal Zeeman effect, why does a spectral line split when a weak magnetic field is applied?",
    "correct": "States with different magnetic quantum numbers acquire different energy shifts.",
    "wrongs": [
      "The nuclear charge increases.",
      "The electron charge changes sign periodically.",
      "Every level shifts by exactly the same amount.",
      "The magnetic field removes all bound states."
    ],
    "expl": "The interaction between orbital magnetic moment and field shifts energies according to magnetic quantum number. Unequal level shifts separate transition frequencies."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-07",
    "sec": "5.7.1",
    "skill": "concept",
    "q": "Light above the photoelectric threshold illuminates a metal. The intensity is increased at fixed frequency. In the usual single-photon regime, what changes?",
    "correct": "The emission rate increases while maximum kinetic energy stays fixed.",
    "wrongs": [
      "Maximum kinetic energy increases while emission rate stays fixed.",
      "Both maximum kinetic energy and work function increase.",
      "The threshold frequency decreases.",
      "The emitted electrons all stop moving."
    ],
    "expl": "Photon energy is fixed by frequency. Greater intensity supplies more photons; $K_{\\max}=hf-\\phi$ is unchanged."
  },
  {
    "topic": "atomic",
    "id": "reason-atomic-08",
    "sec": "5.7.2",
    "skill": "concept",
    "q": "Hydrogen's fine structure is explained principally by which effects?",
    "correct": "Relativistic corrections and spin-orbit coupling",
    "wrongs": [
      "Only the finite number of atoms in a sample",
      "Only the thermal speed of the whole atom",
      "The classical Doppler effect alone",
      "A change of the electron's electric charge between orbitals"
    ],
    "expl": "Fine structure includes relativistic kinetic corrections and spin-orbit coupling, with an additional Darwin term for appropriate states. Thermal motion instead broadens lines."
  },
  {
    "topic": "sr",
    "id": "reason-sr-01",
    "sec": "6.1.1",
    "skill": "concept",
    "q": "Two events are spacelike separated. Which statement is correct?",
    "correct": "Their time order can differ between inertial frames.",
    "wrongs": [
      "One event can causally influence the other using a subluminal signal.",
      "Their spatial separation is zero in some inertial frame.",
      "Their interval is timelike in a sufficiently fast frame.",
      "Their time order is the same in every inertial frame."
    ],
    "expl": "For a spacelike interval, a frame exists where the events are simultaneous and other frames reverse their order. No signal at or below light speed connects them."
  },
  {
    "topic": "sr",
    "id": "reason-sr-02",
    "sec": "6.1.2",
    "skill": "concept",
    "q": "Two events occur at the same position in a clock's rest frame. What time interval does that clock measure?",
    "correct": "The proper time between the events",
    "wrongs": [
      "The longest time interval measured by any inertial observer",
      "Zero time in every frame",
      "The spatial interval divided by light speed in every frame",
      "An interval that depends on the clock's color"
    ],
    "expl": "A clock present at both events records proper time. Other inertial frames measuring this timelike separation have a larger coordinate-time interval."
  },
  {
    "topic": "sr",
    "id": "reason-sr-03",
    "sec": "6.1.3",
    "skill": "concept",
    "q": "A rod moves parallel to its length relative to an observer. How must the observer measure its length in that observer's frame?",
    "correct": "Record both endpoint positions simultaneously in that frame.",
    "wrongs": [
      "Record one endpoint and then wait for the other to reach it.",
      "Record the endpoints simultaneously only in the rod's rest frame.",
      "Multiply its proper length by the Lorentz factor.",
      "Use the interval between two ticks of a clock attached to its center."
    ],
    "expl": "Length is a simultaneous separation in the measuring frame. Confusing simultaneity between frames produces the wrong contraction result."
  },
  {
    "topic": "sr",
    "id": "reason-sr-04",
    "sec": "6.1.4",
    "skill": "concept",
    "q": "A spacecraft traveling rapidly relative to Earth emits a light pulse forward in vacuum. What speed does an inertial Earth observer measure for the pulse?",
    "correct": "$c$",
    "wrongs": [
      "$c+v$",
      "$c-v$",
      "$c/2$",
      "$2c$"
    ],
    "expl": "The speed of light in vacuum is invariant. Relativistic velocity addition returns $c$ for light regardless of the source's subluminal speed."
  },
  {
    "topic": "sr",
    "id": "reason-sr-05",
    "sec": "6.2.2",
    "skill": "concept",
    "q": "Which quantity is the same in all inertial frames for a freely moving massive particle?",
    "correct": "$E^2-p^2c^2$",
    "wrongs": [
      "Its total energy $E$",
      "Its three-momentum magnitude $p$",
      "Its kinetic energy",
      "Its speed"
    ],
    "expl": "The energy-momentum invariant equals $m^2c^4$. Energy, momentum, and speed individually depend on the frame."
  },
  {
    "topic": "sr",
    "id": "reason-sr-06",
    "sec": "6.3.2",
    "skill": "concept",
    "q": "Two photons of equal energy move in opposite directions. What is true of their combined system?",
    "correct": "It has zero total momentum and nonzero invariant mass.",
    "wrongs": [
      "It has zero invariant mass because each photon is massless.",
      "It has zero total energy.",
      "Its center-of-momentum frame cannot exist.",
      "Its total momentum magnitude equals twice a single photon's momentum."
    ],
    "expl": "Opposite momenta cancel while energies add. The system invariant mass is total energy divided by $c^2$ in its center-of-momentum frame."
  },
  {
    "topic": "sr",
    "id": "reason-sr-07",
    "sec": "6.3.1",
    "skill": "concept",
    "q": "A massive particle's total energy greatly exceeds its rest energy. Which approximation is appropriate?",
    "correct": "$E\\approx pc$",
    "wrongs": [
      "$E\\approx p^2/(2m)$",
      "$E\\approx mc^2$ with negligible kinetic energy",
      "$p\\approx mv$ at every speed",
      "$v\\approx 2c$"
    ],
    "expl": "When $pc\\gg mc^2$, the rest-mass term in $E^2=p^2c^2+m^2c^4$ is negligible. The particle still travels below light speed."
  },
  {
    "topic": "sr",
    "id": "reason-sr-08",
    "sec": "6.4.1",
    "skill": "concept",
    "q": "A distant source recedes directly from an observer. Relative to the source rest-frame spectrum, what does the observer see?",
    "correct": "Lower frequencies and longer wavelengths",
    "wrongs": [
      "Higher frequencies and shorter wavelengths",
      "Lower frequencies and shorter wavelengths",
      "Unchanged frequencies but longer wavelengths",
      "Higher frequencies but unchanged wavelengths"
    ],
    "expl": "Longitudinal recession produces a relativistic redshift. In vacuum, lower frequency means longer wavelength because their product is $c$."
  },
  {
    "topic": "lab",
    "id": "reason-lab-01",
    "sec": "7.1.2",
    "skill": "graph",
    "q": "A straight line of slope $-2$ appears on a plot of $\\log y$ versus $\\log x$. Which relation is consistent with the data for positive $x,y$?",
    "correct": "$y=A x^{-2}$",
    "wrongs": [
      "$y=Ae^{-2x}$",
      "$y=A-2x$",
      "$y=A\\log(x^{-2})$",
      "$y=A x^2$"
    ],
    "expl": "Taking logs of a power law gives $\\log y=\\log A+n\\log x$. Its log-log slope is the exponent, not an exponential decay constant.",
    "fig": "<svg viewBox=\"0 0 320 180\" width=\"320\" role=\"img\" aria-label=\"Log y versus log x follows a straight line of slope minus two.\" style=\"max-width:100%;height:auto\"><g stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"><path d=\"M40 15V145H300\"/><path d=\"M35 23L40 15L45 23M292 140L300 145L292 150\"/><path d=\"M75 35L245 120\"/><text x=\"5\" y=\"12\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">log y</text><text x=\"250\" y=\"170\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">log x</text><text x=\"140\" y=\"56\" stroke=\"none\" fill=\"currentColor\" font-size=\"14\">slope = \u22122</text></g></svg>"
  },
  {
    "topic": "lab",
    "id": "reason-lab-02",
    "sec": "7.2.1",
    "skill": "experiment",
    "q": "Repeated measurements are tightly clustered but all exceed a calibrated reference by about the same amount. What is the most likely issue?",
    "correct": "A systematic offset",
    "wrongs": [
      "Large independent random errors",
      "Insufficient resolution causing a symmetric scatter",
      "Poisson fluctuations alone",
      "An uncertainty that necessarily vanishes after averaging"
    ],
    "expl": "A reproducible offset indicates a calibration bias. Averaging independent random errors improves precision but does not remove a fixed bias."
  },
  {
    "topic": "lab",
    "id": "reason-lab-03",
    "sec": "7.2.2",
    "skill": "scaling",
    "q": "A detector measures a constant Poisson count rate with negligible background. Counting time is quadrupled. What happens to the relative counting uncertainty?",
    "correct": "It halves.",
    "wrongs": [
      "It doubles.",
      "It becomes one quarter as large.",
      "It stays fixed.",
      "It quadruples."
    ],
    "expl": "Counts grow with time and the Poisson standard deviation is $\\sqrt N$. Relative uncertainty scales as $1/\\sqrt N$."
  },
  {
    "topic": "lab",
    "id": "reason-lab-04",
    "sec": "7.3.2",
    "skill": "experiment",
    "q": "A voltmeter is used to measure the voltage across a resistor. Which ideal property minimizes disturbance of the circuit?",
    "correct": "Very high input resistance",
    "wrongs": [
      "Very low input resistance",
      "Zero input resistance",
      "An input resistance equal to the resistor being measured",
      "An input resistance that is always negative"
    ],
    "expl": "A parallel voltmeter should draw negligible current. High input resistance minimizes loading and the resulting voltage change."
  },
  {
    "topic": "lab",
    "id": "reason-lab-05",
    "sec": "7.3.1",
    "skill": "concept",
    "q": "At sufficiently high frequency, how does an ideal capacitor's impedance magnitude compare with its low-frequency value?",
    "correct": "It is smaller.",
    "wrongs": [
      "It is larger.",
      "It is exactly the same.",
      "It equals its capacitance in ohms.",
      "It is always zero at every nonzero frequency."
    ],
    "expl": "Capacitive reactance is $1/(\\omega C)$. Increasing frequency lowers the impedance magnitude; only the infinite-frequency ideal limit approaches zero."
  },
  {
    "topic": "lab",
    "id": "reason-lab-06",
    "sec": "7.4.3",
    "skill": "experiment",
    "q": "A radiation counter misses events arriving shortly after a recorded pulse. At high true count rates, what bias does this dead time produce in the raw count rate?",
    "correct": "An underestimate of the true rate",
    "wrongs": [
      "An overestimate of the true rate",
      "No bias at any rate",
      "A negative count rate",
      "An exact doubling of the true rate"
    ],
    "expl": "Events during recovery are not recorded, so the uncorrected rate is too low. Dead-time corrections matter increasingly at high rates."
  },
  {
    "topic": "lab",
    "id": "reason-lab-07",
    "sec": "7.5.1",
    "skill": "concept",
    "q": "Why is population inversion important in an ordinary two-level description of a laser transition?",
    "correct": "It allows stimulated emission to exceed absorption on that transition.",
    "wrongs": [
      "It makes spontaneous emission impossible.",
      "It changes photons into electrons.",
      "It removes the need for an energy supply.",
      "It forces every atomic state to have the same population."
    ],
    "expl": "More atoms in the upper laser level than the lower one permit net gain. Pumping is required; a simple isolated two-level system is not a practical inversion scheme."
  },
  {
    "topic": "lab",
    "id": "reason-lab-08",
    "sec": "7.5.3",
    "skill": "scaling",
    "q": "One mirror of a Michelson interferometer is moved by half the vacuum wavelength along its arm in air. How many fringe cycles pass a fixed observation point?",
    "correct": "1",
    "wrongs": [
      "One half",
      "2",
      "4",
      "0"
    ],
    "expl": "The round-trip optical path changes by twice the mirror displacement. A path change of one wavelength gives one full fringe cycle."
  },
  {
    "topic": "lab",
    "id": "reason-lab-09",
    "sec": "7.1.1",
    "skill": "experiment",
    "q": "A proposed period depends only on a length $L$ and gravitational acceleration $g$. Which expression has the dimensions of time?",
    "correct": "$\\sqrt{L/g}$",
    "wrongs": [
      "$\\sqrt{g/L}$",
      "$L/g$",
      "$Lg$",
      "$g/L$"
    ],
    "expl": "Acceleration has dimensions length divided by time squared. Therefore $L/g$ has dimensions time squared; a dimensionless constant cannot be fixed this way."
  },
  {
    "topic": "lab",
    "id": "reason-lab-10",
    "sec": "7.2.1",
    "skill": "experiment",
    "q": "The same uncertain length measurement is used twice to compute $A=L^2$. For a small relative length uncertainty, what is the relative uncertainty in $A$?",
    "correct": "Twice the relative uncertainty in $L$",
    "wrongs": [
      "The square root of two times the relative uncertainty in $L$",
      "The same as the relative uncertainty in $L$",
      "Half the relative uncertainty in $L$",
      "The square of the relative uncertainty in $L$"
    ],
    "expl": "For one uncertain variable, differentiation gives $dA/A=2\\,dL/L$. The two factors are perfectly correlated, not independent measurements to add in quadrature."
  },
  {
    "topic": "spec",
    "id": "reason-spec-01",
    "sec": "8.1.3",
    "skill": "concept",
    "q": "In beta-minus decay of a free neutron, which particles accompany the proton?",
    "correct": "An electron and an electron antineutrino",
    "wrongs": [
      "A positron and an electron neutrino",
      "An electron and a photon only",
      "Two electrons only",
      "A positron and a neutron"
    ],
    "expl": "Charge and lepton-number conservation require an electron and electron antineutrino. The antineutrino also carries energy and momentum."
  },
  {
    "topic": "spec",
    "id": "reason-spec-02",
    "sec": "8.1.2",
    "skill": "concept",
    "q": "Why can both fusion of light nuclei and fission of very heavy nuclei release energy?",
    "correct": "Both can increase binding energy per nucleon toward the iron region.",
    "wrongs": [
      "Both decrease binding energy per nucleon.",
      "Both destroy electric charge.",
      "Both require the final rest mass to exceed the initial rest mass.",
      "Both turn every nucleon into a photon."
    ],
    "expl": "More tightly bound products have lower total rest energy. The binding-energy-per-nucleon curve peaks in the iron and nickel region."
  },
  {
    "topic": "spec",
    "id": "reason-spec-03",
    "sec": "8.1.1",
    "skill": "concept",
    "q": "Which interaction can change one quark flavor into another?",
    "correct": "The weak interaction",
    "wrongs": [
      "The electromagnetic interaction alone",
      "The strong interaction alone",
      "Classical gravity alone",
      "Elastic photon scattering alone"
    ],
    "expl": "Charged-current weak interactions permit flavor change. Strong and electromagnetic interactions conserve quark flavor."
  },
  {
    "topic": "spec",
    "id": "reason-spec-04",
    "sec": "8.2.3",
    "skill": "concept",
    "q": "A donor impurity is added to an otherwise intrinsic semiconductor. At ordinary temperatures, what carrier type does it primarily supply?",
    "correct": "Conduction electrons",
    "wrongs": [
      "Valence-band holes",
      "Free protons",
      "Neutrons",
      "Positrons"
    ],
    "expl": "Donor levels can release electrons into the conduction band, producing n-type material. Acceptor doping instead primarily supplies holes."
  },
  {
    "topic": "spec",
    "id": "reason-spec-05",
    "sec": "8.2.4",
    "skill": "concept",
    "q": "What distinguishes the Meissner effect from merely having zero electrical resistance?",
    "correct": "Expulsion of magnetic flux from the bulk on entering the superconducting state",
    "wrongs": [
      "Unlimited current at every magnetic field",
      "Absence of all magnetic fields outside the sample",
      "Zero thermal conductivity",
      "A positive resistance that falls linearly with temperature"
    ],
    "expl": "A superconductor exhibits magnetic flux expulsion, subject to penetration depth and critical fields. Zero resistivity alone does not specify this equilibrium magnetic response."
  },
  {
    "topic": "spec",
    "id": "reason-spec-06",
    "sec": "8.2.1",
    "skill": "scaling",
    "q": "For a fixed order of Bragg reflection and fixed wavelength, the crystal-plane spacing increases. What happens to the Bragg angle measured from the planes?",
    "correct": "It decreases.",
    "wrongs": [
      "It increases.",
      "It stays fixed.",
      "It must become a right angle.",
      "It becomes twice its original value for any spacing change."
    ],
    "expl": "Bragg's law is $2d\\sin\\theta=n\\lambda$. Increasing spacing lowers the required sine and hence the angle in the usual acute-angle range."
  },
  {
    "topic": "spec",
    "id": "reason-spec-07",
    "sec": "8.3",
    "skill": "concept",
    "q": "A main-sequence star remains approximately in hydrostatic equilibrium. Which effects principally balance?",
    "correct": "Inward gravity and an outward pressure gradient",
    "wrongs": [
      "Gravity and centrifugal force in every star",
      "Electromagnetic attraction and nuclear attraction",
      "Radiation pressure and zero gravity in every star",
      "Nuclear fusion force directly pushing each surface atom outward"
    ],
    "expl": "The pressure gradient supports the star against gravity. Fusion supplies energy that helps maintain pressure but is not itself an extra outward mechanical force."
  },
  {
    "topic": "spec",
    "id": "reason-spec-08",
    "sec": "8.1.2",
    "skill": "graph",
    "q": "A pure radioactive sample is plotted as the logarithm of undecayed nuclei versus time. What shape is expected for a single constant decay rate?",
    "correct": "A straight line with negative slope",
    "wrongs": [
      "A straight line with positive slope",
      "A parabola opening upward",
      "A horizontal line until one half-life, followed by a jump",
      "An oscillating curve"
    ],
    "expl": "Exponential decay obeys $N=N_0e^{-\\lambda t}$. Taking a logarithm gives a line whose negative slope is proportional to the decay constant."
  }
];
  for (const d of items) GRE.addTemplates(d.topic, [{
    id: d.id, sec: d.sec, level: 2, profile: 'reasoning', skill: d.skill,
    gen(R) { return { q: d.q, ...GRE.mc(R, d.correct, d.wrongs), expl: d.expl, fig: d.fig || null }; },
  }]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
