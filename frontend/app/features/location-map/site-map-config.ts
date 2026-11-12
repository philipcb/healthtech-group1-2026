/** A position on the map, `[longitude, latitude]`, as GeoJSON and Mapbox expect */
export type LngLat = [longitude: number, latitude: number];

export type SiteMapBuilding = {
	/** Shown in the lists and on the map, for example "42 Module assembly shop" */
	label: string;
	/** The building's footprint, as a closed ring */
	outline: Array<LngLat>;
	/** More pieces of the building, for a building whose footprint OpenStreetMap splits in several, see `getOutlines` */
	extraOutlines?: Array<Array<LngLat>>;
	/**
	 * How tall the building is drawn in the 3D view, in meters, from the ground to the top of the roof.
	 * `DEFAULT_BUILDING_HEIGHT` when left out. Measured unless a comment says it's estimated, see `siteMaps`.
	 */
	height?: number;
};

/** A typical production hall, for buildings without their own `height` */
export const DEFAULT_BUILDING_HEIGHT = 12;

export type SiteMapConfig = {
	/**
	 * Keyed by the building's name in the backend, `Location.Building`, which is also the hall the aggregate API
	 * groups by. A building only gets exposure data when users are assigned to a location with that name.
	 */
	buildings: Partial<Record<string, SiteMapBuilding>>;
	/**
	 * The yard's other buildings, drawn in 3D as neutral blocks around `buildings`, so the yard looks like the real
	 * place. A GeoJSON file in `public/maps`, with each building's `height` in meters.
	 */
	surroundings?: string;
};

/**
 * The most important buildings of each yard, drawn on a Mapbox satellite map.
 *
 * The outlines are building footprints from OpenStreetMap (© OpenStreetMap contributors, ODbL), matched by hand to the
 * yards' own maps: Verdal's "Yard med beskrivelse bygninger" (2023) and Egersund's yard map. Where one footprint holds
 * several of the yard map's buildings, it's split along the roof lines visible on the satellite imagery:
 * - Egersund: R1, J and P1 are the three strips of one hall; M and P2 are the west and east parts of the hall in front
 *   of it; P5, P6 and P7 share one footprint, and so do M1, M2 and M3.
 * - Verdal: 9 is the tall east-west hall and 8 the long north-south hall of one footprint.
 * Verdal's buildings were matched by fitting the yard map's angle of view to the buildings that were certain (42, 2,
 * 3, 4, 6, 7, 9 and 47) and checking each match against the satellite imagery. 43 Pressure testing shop and 46 Lifting
 * equipment shop are less certain than the rest. The four painting and blasting shops, 17 to 20, are confirmed by
 * their measured heights, which match the yard map's: 19 and 20 are much taller than 17 and 18.
 * Not on the map yet: Verdal's 44 Riser shop and 45 Brace shop, which have no footprint where the yard map puts them,
 * and Egersund's L3, L4 and L13, which couldn't be matched with confidence.
 *
 * The heights, of these buildings and of the `surroundings`, are measured from Kartverket's airborne laser scanning
 * (Høydedata, © Kartverket, CC BY 4.0): the surface model's height at the 90th percentile inside the footprint, so
 * close to the top of the roof, minus the terrain model's median height under it. Rounded to half a meter. Halls built
 * after the scan are estimated instead, which their comments say.
 *
 * "M-hallen" and "A-hallen" are the names the backend already uses for Verdal's 42 and 9.
 */
export const siteMaps: Partial<Record<string, SiteMapConfig>> = {
	"Aker Solutions Verdal": {
		surroundings: "/maps/aker-verdal-surroundings.geojson",
		buildings: {
			"M-hallen": {
				label: "42 Module assembly shop",
				height: 36.5,
				outline: [
					[11.4393022, 63.788848],
					[11.4392939, 63.7884452],
					[11.4396605, 63.7884438],
					[11.4396606, 63.7884487],
					[11.44002, 63.7884473],
					[11.4400199, 63.7884427],
					[11.44039, 63.7884413],
					[11.44039, 63.7884447],
					[11.4407518, 63.7884433],
					[11.4407522, 63.7884617],
					[11.4408358, 63.7884613],
					[11.4408432, 63.7888183],
					[11.4407608, 63.7888187],
					[11.4407612, 63.7888381],
					[11.440549, 63.7888389],
					[11.440551, 63.7889395],
					[11.439564, 63.7889435],
					[11.439562, 63.788847],
					[11.4393022, 63.788848],
				],
			},
			"A-hallen": {
				label: "9 Assembly shop A2",
				height: 26,
				outline: [
					[11.4462965, 63.7882658],
					[11.446305, 63.7886101],
					[11.4438141, 63.7886219],
					[11.4438059, 63.7882883],
					[11.444123, 63.7882867],
					[11.4441225, 63.7882658],
					[11.444294, 63.7882658],
					[11.4442945, 63.788286],
					[11.4449098, 63.788283],
					[11.4449094, 63.7882658],
					[11.4462965, 63.7882658],
				],
			},
			"8 Service facilities assembly shop A2": {
				label: "8 Service facilities assembly shop A2",
				height: 15,
				outline: [
					[11.4448782, 63.7875863],
					[11.4448729, 63.7873692],
					[11.4451518, 63.7873678],
					[11.4451492, 63.78726],
					[11.4455711, 63.787258],
					[11.4455699, 63.7872069],
					[11.445719, 63.7872061],
					[11.44572, 63.7872458],
					[11.4462712, 63.7872432],
					[11.4462768, 63.7874706],
					[11.4463378, 63.7874704],
					[11.4463392, 63.7875309],
					[11.446278, 63.7875311],
					[11.446291, 63.7880676],
					[11.4463484, 63.7880674],
					[11.4463497, 63.7881209],
					[11.446293, 63.7881211],
					[11.4462965, 63.7882658],
					[11.4441225, 63.7882658],
					[11.444122, 63.7882469],
					[11.4442935, 63.7882461],
					[11.444294, 63.7882658],
					[11.4449094, 63.7882658],
					[11.4449052, 63.7880951],
					[11.4451694, 63.7880939],
					[11.4451636, 63.7878578],
					[11.4448848, 63.7878592],
					[11.4448822, 63.7877508],
					[11.444798, 63.7877512],
					[11.444794, 63.7875867],
					[11.4448782, 63.7875863],
				],
			},
			"6 Pipe workshop": {
				label: "6 Pipe workshop",
				height: 9.5,
				outline: [
					[11.442969, 63.7877828],
					[11.4432772, 63.7877812],
					[11.4432848, 63.788055],
					[11.4423583, 63.78806],
					[11.4423477, 63.7876797],
					[11.442225, 63.7876803],
					[11.442222, 63.78757],
					[11.442963, 63.787566],
					[11.442969, 63.7877828],
				],
			},
			"7 Pipe workshop Duplex": {
				label: "7 Pipe workshop Duplex",
				height: 9,
				outline: [
					[11.4439312, 63.7880624],
					[11.443441, 63.7880646],
					[11.443429, 63.787563],
					[11.4438512, 63.787561],
					[11.4438598, 63.7879242],
					[11.4439278, 63.7879238],
					[11.4439312, 63.7880624],
				],
			},
			"4 Warehouse piping": {
				label: "4 Warehouse piping",
				height: 11,
				outline: [
					[11.4426739, 63.7874432],
					[11.4426741, 63.7874477],
					[11.442533, 63.7874483],
					[11.442529, 63.7872778],
					[11.44267, 63.7872772],
					[11.44267, 63.7872809],
					[11.4443791, 63.7872731],
					[11.4443829, 63.7874357],
					[11.4440563, 63.7874372],
					[11.4440578, 63.7875011],
					[11.4438943, 63.7875019],
					[11.4438927, 63.7874379],
					[11.4431772, 63.7874411],
					[11.4431788, 63.787506],
					[11.4429618, 63.787507],
					[11.4429602, 63.7874418],
					[11.4426739, 63.7874432],
				],
			},
			"2 Prefabrication shop A1": {
				label: "2 Prefabrication shop A1",
				height: 20,
				// Two footprints in OpenStreetMap: the west half of the long hall with the wing going south, and its east half.
				// Includes 1 Service facilities prefabrication shop A1, the low annex at the end of the wing, which has no footprint of its own
				outline: [
					[11.4428521, 63.7856675],
					[11.4428389, 63.7850861],
					[11.4421996, 63.7850889],
					[11.4422014, 63.7851653],
					[11.4423301, 63.7851647],
					[11.4423308, 63.7851957],
					[11.442202, 63.7851963],
					[11.442202, 63.7852],
					[11.4421022, 63.7852004],
					[11.4420442, 63.7852007],
					[11.441788, 63.7852018],
					[11.441785, 63.7850739],
					[11.4417233, 63.7850741],
					[11.4417218, 63.7850081],
					[11.4417832, 63.7850079],
					[11.4417828, 63.784991],
					[11.4429099, 63.784986],
					[11.4429101, 63.7849936],
					[11.443635, 63.7849904],
					[11.443637, 63.7850807],
					[11.4437329, 63.7850803],
					[11.4437371, 63.7852673],
					[11.4434269, 63.7852687],
					[11.4434323, 63.7855074],
					[11.4434359, 63.785665],
					[11.4434252, 63.785665],
					[11.4434308, 63.7859151],
					[11.4419008, 63.7859219],
					[11.4418952, 63.785672],
					[11.4421082, 63.785671],
					[11.4421078, 63.7856547],
					[11.4422108, 63.7856543],
					[11.4422112, 63.7856702],
					[11.4423078, 63.7856698],
					[11.4423072, 63.7856447],
					[11.4424122, 63.7856443],
					[11.4424128, 63.7856695],
					[11.4428521, 63.7856675],
				],
				extraOutlines: [
					[
						[11.4434359, 63.785665],
						[11.4434323, 63.7855074],
						[11.4436072, 63.7855066],
						[11.4436088, 63.7855776],
						[11.44366, 63.7855774],
						[11.443662, 63.7856641],
						[11.4443903, 63.7856609],
						[11.4443897, 63.7856342],
						[11.4444932, 63.7856338],
						[11.4444938, 63.7856612],
						[11.4450147, 63.7856588],
						[11.4450203, 63.785908],
						[11.4434308, 63.7859151],
						[11.4434252, 63.785665],
						[11.4434359, 63.785665],
					],
				],
			},
			"3 Cold bending/pipe shop": {
				label: "3 Cold bending/pipe shop",
				height: 9.5,
				outline: [
					[11.444096, 63.7864338],
					[11.44409, 63.7861373],
					[11.445, 63.7861337],
					[11.445006, 63.7864302],
					[11.444096, 63.7864338],
				],
			},
			"17 Painting and blasting shop \u00d8stbl\u00e5sa": {
				label: "17 Painting and blasting shop \u00d8stbl\u00e5sa",
				height: 10.5,
				outline: [
					[11.4446709, 63.7903403],
					[11.4445354, 63.7903407],
					[11.4445286, 63.7899127],
					[11.4446671, 63.7899123],
					[11.4446669, 63.789898],
					[11.4449863, 63.789897],
					[11.4449937, 63.790356],
					[11.4446711, 63.790357],
					[11.4446709, 63.7903403],
				],
			},
			"18 Painting and blasting shop Buahallen": {
				label: "18 Painting and blasting shop Buahallen",
				height: 9,
				outline: [
					[11.4440135, 63.7903629],
					[11.4439975, 63.7898584],
					[11.444296, 63.7898566],
					[11.444312, 63.7903611],
					[11.4440135, 63.7903629],
				],
			},
			"19 Painting and blasting shop Dovrehallen": {
				label: "19 Painting and blasting shop Dovrehallen",
				height: 17.5,
				outline: [
					[11.443841, 63.7903655],
					[11.4432071, 63.7903685],
					[11.4432069, 63.7903601],
					[11.4430519, 63.7903609],
					[11.4430282, 63.7893629],
					[11.4431855, 63.7893621],
					[11.4431854, 63.789358],
					[11.443817, 63.789355],
					[11.443841, 63.7903655],
				],
			},
			"20 Painting and blasting shop Vestbl\u00e5sa": {
				label: "20 Painting and blasting shop Vestbl\u00e5sa",
				height: 17.5,
				outline: [
					[11.4421899, 63.7902922],
					[11.442055, 63.7902928],
					[11.442041, 63.7896974],
					[11.4422101, 63.7896966],
					[11.4422089, 63.7896428],
					[11.4427789, 63.7896402],
					[11.4427791, 63.7896492],
					[11.4428632, 63.7896488],
					[11.4428718, 63.7900138],
					[11.4427881, 63.7900142],
					[11.4427889, 63.7900448],
					[11.4429387, 63.7900442],
					[11.4429443, 63.7902832],
					[11.4427943, 63.7902838],
					[11.4427967, 63.7903822],
					[11.442226, 63.7903848],
					[11.442225, 63.7903439],
					[11.4421911, 63.7903441],
					[11.4421899, 63.7902922],
				],
			},
			"43 Pressure testing shop": {
				label: "43 Pressure testing shop",
				height: 10,
				outline: [
					[11.448297, 63.7862521],
					[11.448311, 63.7866141],
					[11.448062, 63.7866159],
					[11.448048, 63.7862539],
					[11.448297, 63.7862521],
				],
			},
			"46 Lifting equipment shop": {
				label: "46 Lifting equipment shop",
				height: 9.5,
				outline: [
					[11.4427926, 63.7913646],
					[11.4428041, 63.7917913],
					[11.4421976, 63.7917945],
					[11.442186, 63.7913679],
					[11.4427926, 63.7913646],
				],
			},
		},
	},
	"Aker Solutions Egersund": {
		surroundings: "/maps/aker-egersund-surroundings.geojson",
		buildings: {
			L1: {
				label: "L1",
				height: 12,
				outline: [
					[5.981535, 58.427911],
					[5.981889, 58.427911],
					[5.981889, 58.428036],
					[5.981535, 58.428036],
					[5.981535, 58.428031],
					[5.980838, 58.428031],
					[5.980838, 58.427325],
					[5.981535, 58.427325],
					[5.981535, 58.427911],
				],
			},
			L2: {
				label: "L2",
				// Estimated: newer than the laser scan. Drawn about as tall as L1 next to it on the yard map
				height: 12,
				outline: [
					[5.981927, 58.4279888],
					[5.9825755, 58.4279888],
					[5.9825856, 58.4273204],
					[5.9819331, 58.4273215],
					[5.981927, 58.4279888],
				],
			},
			K1: {
				label: "K1",
				height: 18,
				outline: [
					[5.9846345, 58.425825],
					[5.9846345, 58.4257465],
					[5.98475, 58.4257465],
					[5.98475, 58.425587],
					[5.984882, 58.425587],
					[5.984882, 58.425585],
					[5.985094, 58.425585],
					[5.985094, 58.4259415],
					[5.984749, 58.4259415],
					[5.984749, 58.425825],
					[5.9846345, 58.425825],
				],
			},
			R2: {
				label: "R2",
				height: 9,
				outline: [
					[5.985694, 58.425347],
					[5.985734, 58.425347],
					[5.985734, 58.425375],
					[5.985703, 58.425375],
					[5.985703, 58.4255755],
					[5.9851255, 58.4255755],
					[5.9851255, 58.425374],
					[5.9850845, 58.425374],
					[5.9850845, 58.425418],
					[5.984954, 58.425418],
					[5.984954, 58.425374],
					[5.984846, 58.425374],
					[5.984846, 58.4254443],
					[5.984625, 58.4254443],
					[5.984442, 58.4254443],
					[5.984442, 58.425258],
					[5.9847275, 58.425258],
					[5.985694, 58.425258],
					[5.985694, 58.425347],
				],
			},
			R1: {
				label: "R1",
				height: 8,
				outline: [
					[5.9862, 58.4248366],
					[5.9862, 58.424837],
					[5.9863825, 58.424837],
					[5.9863825, 58.424931],
					[5.98642, 58.424931],
					[5.98642, 58.424999],
					[5.986382, 58.424999],
					[5.986382, 58.425039],
					[5.986108, 58.425039],
					[5.986108, 58.4249855],
					[5.985615, 58.4249855],
					[5.985615, 58.425024],
					[5.985459, 58.425024],
					[5.985459, 58.4249845],
					[5.9847105, 58.4249845],
					[5.9847105, 58.424882],
					[5.9847495, 58.424882],
					[5.9847495, 58.4248366],
					[5.9862, 58.4248366],
				],
			},
			J: {
				label: "J",
				height: 11.5,
				outline: [
					[5.986208, 58.4247068],
					[5.986208, 58.424836],
					[5.9862, 58.424836],
					[5.9862, 58.4248366],
					[5.9847495, 58.4248366],
					[5.9847495, 58.424835],
					[5.984548, 58.424835],
					[5.984548, 58.4247068],
					[5.986208, 58.4247068],
				],
			},
			P1: {
				label: "P1",
				height: 14.5,
				outline: [
					[5.986215, 58.4244605],
					[5.986215, 58.424463],
					[5.986281, 58.424463],
					[5.986281, 58.424477],
					[5.9862145, 58.424477],
					[5.9862145, 58.424703],
					[5.986208, 58.424703],
					[5.986208, 58.4247068],
					[5.984548, 58.4247068],
					[5.984548, 58.424704],
					[5.9845645, 58.424704],
					[5.9845645, 58.4244605],
					[5.986215, 58.4244605],
				],
			},
			M: {
				label: "M",
				height: 27,
				outline: [
					[5.9845637, 58.424704],
					[5.984548, 58.424704],
					[5.984506, 58.424704],
					[5.984506, 58.424709],
					[5.983993, 58.424709],
					[5.983993, 58.4247],
					[5.983672, 58.4247],
					[5.983672, 58.424534],
					[5.983672, 58.4245115],
					[5.983672, 58.424161],
					[5.983586, 58.424161],
					[5.983586, 58.424103],
					[5.983628, 58.424103],
					[5.983628, 58.424108],
					[5.983673, 58.424108],
					[5.983673, 58.424048],
					[5.983934, 58.424048],
					[5.983934, 58.424041],
					[5.9838625, 58.424041],
					[5.9838625, 58.42392],
					[5.983876, 58.42392],
					[5.983876, 58.4238303],
					[5.9845637, 58.4238303],
					[5.9845637, 58.424704],
				],
			},
			P2: {
				label: "P2",
				height: 27.5,
				outline: [
					[5.9845645, 58.4244605],
					[5.9845645, 58.424704],
					[5.9845637, 58.424704],
					[5.9845637, 58.4238303],
					[5.9850635, 58.4238303],
					[5.9862045, 58.4238303],
					[5.986217, 58.4238303],
					[5.986217, 58.423862],
					[5.9862355, 58.423862],
					[5.9862355, 58.4241335],
					[5.986254, 58.4241335],
					[5.986254, 58.4241585],
					[5.9862345, 58.4241585],
					[5.9862345, 58.424431],
					[5.986215, 58.424431],
					[5.986215, 58.4244605],
					[5.9845645, 58.4244605],
				],
			},
			SDV: {
				label: "SDV, service building",
				height: 8.5,
				outline: [
					[5.9862045, 58.4238303],
					[5.9850635, 58.4238303],
					[5.9850635, 58.4236745],
					[5.9862045, 58.4236745],
					[5.9862045, 58.4238303],
				],
			},
			P5: {
				label: "P5",
				height: 13,
				outline: [
					[5.987998, 58.424614],
					[5.987998, 58.424535],
					[5.9880463, 58.424535],
					[5.9880463, 58.4254238],
					[5.9879273, 58.425424],
					[5.9879311, 58.425224],
					[5.98768, 58.4252175],
					[5.98768, 58.425207],
					[5.9876645, 58.425207],
					[5.9876645, 58.425004],
					[5.987678, 58.425004],
					[5.987678, 58.424614],
					[5.987998, 58.424614],
				],
			},
			P7: {
				label: "P7",
				height: 13,
				outline: [
					[5.9880463, 58.4249848],
					[5.9885515, 58.4249848],
					[5.9885515, 58.42506],
					[5.9884385, 58.42506],
					[5.9884385, 58.425077],
					[5.988509, 58.425077],
					[5.988509, 58.42511],
					[5.988438, 58.42511],
					[5.988438, 58.4252175],
					[5.9884338, 58.4254232],
					[5.9880463, 58.4254238],
					[5.9880463, 58.4249848],
				],
			},
			P6: {
				label: "P6",
				height: 13,
				outline: [
					[5.9880463, 58.4249848],
					[5.9880463, 58.424535],
					[5.988154, 58.424535],
					[5.988154, 58.424614],
					[5.98844, 58.424614],
					[5.98844, 58.424951],
					[5.988458, 58.424951],
					[5.988458, 58.4249415],
					[5.988499, 58.4249415],
					[5.988499, 58.424951],
					[5.9885515, 58.424951],
					[5.9885515, 58.4249848],
					[5.9880463, 58.4249848],
				],
			},
			R3: {
				label: "R3",
				height: 9.5,
				outline: [
					[5.987672, 58.424363],
					[5.987672, 58.424176],
					[5.988542, 58.424176],
					[5.988542, 58.424363],
					[5.987672, 58.424363],
				],
			},
			M4: {
				label: "M4",
				height: 8.5,
				outline: [
					[5.988396, 58.424043],
					[5.988334, 58.424043],
					[5.988334, 58.423962],
					[5.98835, 58.423962],
					[5.98835, 58.423939],
					[5.988396, 58.423939],
					[5.988396, 58.423919],
					[5.988718, 58.423919],
					[5.988718, 58.424138],
					[5.988548, 58.424138],
					[5.988548, 58.4241235],
					[5.988405, 58.4241235],
					[5.988405, 58.424084],
					[5.988396, 58.424084],
					[5.988396, 58.424043],
				],
			},
			M3: {
				label: "M3",
				height: 13,
				outline: [
					[5.987782, 58.42363],
					[5.987618, 58.42363],
					[5.987618, 58.423641],
					[5.987111, 58.423641],
					[5.987111, 58.423631],
					[5.9870975, 58.423631],
					[5.9870975, 58.4232875],
					[5.9877985, 58.4232875],
					[5.9877985, 58.42364],
					[5.987782, 58.42364],
					[5.987782, 58.42363],
				],
			},
			M2: {
				label: "M2",
				height: 10,
				outline: [
					[5.9877985, 58.4232875],
					[5.988143, 58.4232875],
					[5.988143, 58.423256],
					[5.9882405, 58.423256],
					[5.9882405, 58.4232065],
					[5.9882586, 58.4232065],
					[5.9882586, 58.423729],
					[5.988243, 58.423729],
					[5.988243, 58.42364],
					[5.9877985, 58.42364],
					[5.9877985, 58.4232875],
				],
			},
			M1: {
				label: "M1",
				height: 8.5,
				outline: [
					[5.9882586, 58.4232065],
					[5.9886555, 58.4232065],
					[5.9886555, 58.4232905],
					[5.988796, 58.4232905],
					[5.988796, 58.423311],
					[5.988832, 58.423311],
					[5.988832, 58.423337],
					[5.9888955, 58.423337],
					[5.9888955, 58.423631],
					[5.988843, 58.423631],
					[5.988843, 58.42372],
					[5.988795, 58.42372],
					[5.988795, 58.423729],
					[5.9882586, 58.423729],
					[5.9882586, 58.4232065],
				],
			},
			P3: {
				label: "P3",
				height: 27,
				outline: [
					[5.9816667, 58.423651],
					[5.9816693, 58.423327],
					[5.9825793, 58.423329],
					[5.9825767, 58.423653],
					[5.9816667, 58.423651],
				],
			},
			P4: {
				label: "P4",
				// Estimated: newer than the laser scan. Drawn a little lower than P3 next to it on the yard map
				height: 20,
				outline: [
					[5.981586, 58.4239841],
					[5.9824788, 58.4239901],
					[5.9824778, 58.4237285],
					[5.9815941, 58.4237308],
					[5.981586, 58.4239841],
				],
			},
		},
	},
};

export function hasSiteMap(site: string) {
	return siteMaps[site] !== undefined;
}

/** The building's label on the site map, or its backend name for a building that isn't on one */
export function getBuildingLabel(site: string, buildingName: string) {
	return siteMaps[site]?.buildings[buildingName]?.label ?? buildingName;
}

/** How tall the building is drawn in the 3D view, in meters */
export function getBuildingHeight(site: string, buildingName: string) {
	return siteMaps[site]?.buildings[buildingName]?.height ?? DEFAULT_BUILDING_HEIGHT;
}

/** The smallest box around the outlines, as `[southwest, northeast]` */
export function getBounds(outlines: Array<Array<LngLat>>): [LngLat, LngLat] {
	const points = outlines.flat();
	const longitudes = points.map(([longitude]) => longitude);
	const latitudes = points.map(([, latitude]) => latitude);

	return [
		[Math.min(...longitudes), Math.min(...latitudes)],
		[Math.max(...longitudes), Math.max(...latitudes)],
	];
}

/** The middle of the outlines' bounding box, where a building's marker goes */
export function getCenter(outlines: Array<Array<LngLat>>): LngLat {
	const [[west, south], [east, north]] = getBounds(outlines);

	return [(west + east) / 2, (south + north) / 2];
}

/** All of a building's pieces, `outline` first */
export function getOutlines(building: SiteMapBuilding): Array<Array<LngLat>> {
	return [building.outline, ...(building.extraOutlines ?? [])];
}
